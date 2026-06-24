"""LangGraph ReAct agent loop: Planner -> ToolSelector -> ToolExecutor -> Observer -> Responder.

State carries: task list, calendar context, user preferences, conversation
history, the evolving plan, and a trace of actions taken (tool name + result)
for persistence to the `sessions` table.

The loop performs sequential tool calling: ToolSelector picks one tool at a
time, ToolExecutor runs it and waits for the result before Observer decides
whether another tool call is needed or the loop should proceed to Responder.
"""
from __future__ import annotations

import json
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from app.agent.tools import TOOL_REGISTRY
from app.core.db import Database
from app.services.llm_router import LLMProviderError, route_llm

MAX_TOOL_STEPS = 4


class AgentState(TypedDict, total=False):
    user_id: str
    user_message: str
    conversation_history: List[Dict[str, str]]
    task_list: List[Dict[str, Any]]
    calendar_context: List[Dict[str, Any]]
    user_prefs: Dict[str, Any]
    plan: Dict[str, Any]
    actions_taken: List[Dict[str, Any]]
    next_tool: Optional[str]
    next_tool_args: Dict[str, Any]
    step_count: int
    final_response: str
    db: Any  # Database handle (not serialized to sessions table)


TOOL_DESCRIPTIONS = """Available tools:
- calendar_read(days:int): read upcoming calendar events
- calendar_write(title:str, start:str, end:str, description:str): create a calendar event
- task_decompose(task_id:str): break a task into ordered subtasks
- conflict_detect(days:int): find overlaps between task deadlines and calendar events
- task_prioritize(): recompute AI priority scores (0-100) for all open tasks
- send_notification(task_id:str|null): send escalating deadline notification(s)"""


async def planner_node(state: AgentState) -> AgentState:
    """LLM reasons over user input + task list + calendar context to decide
    on a structured plan and whether tools are needed."""
    system = (
        "You are the planning module of an autonomous productivity agent. "
        f"{TOOL_DESCRIPTIONS}\n"
        "Given the user's message, their task list, and calendar context, "
        "decide on ONE next tool to call (or none if you have enough info). "
        'Return ONLY JSON: {"thought": str, "tool": str|null, "tool_args": object, '
        '"plan_summary": str}. No prose, no markdown fences.'
    )
    user_content = json.dumps({
        "message": state.get("user_message"),
        "tasks": state.get("task_list", [])[:20],
        "calendar": state.get("calendar_context", [])[:20],
        "prefs": state.get("user_prefs", {}),
        "steps_so_far": state.get("step_count", 0),
        "actions_taken": state.get("actions_taken", []),
    }, default=str)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    try:
        text = await route_llm("planning", messages)
        parsed = json.loads(text) if text.strip().startswith("{") else None
    except (LLMProviderError, json.JSONDecodeError, ValueError):
        parsed = None

    if not parsed:
        parsed = {
            "thought": "No LLM provider available; defaulting to prioritization only.",
            "tool": "task_prioritize" if state.get("step_count", 0) == 0 else None,
            "tool_args": {},
            "plan_summary": "Recomputed priorities from current task list (LLM unavailable).",
        }

    state["next_tool"] = parsed.get("tool")
    state["next_tool_args"] = parsed.get("tool_args") or {}
    plan = state.get("plan", {})
    plan["thought"] = parsed.get("thought")
    plan["summary"] = parsed.get("plan_summary")
    state["plan"] = plan
    return state


async def tool_selector_node(state: AgentState) -> AgentState:
    """Validates the planner's chosen tool exists; clears it otherwise."""
    tool = state.get("next_tool")
    if tool and tool not in TOOL_REGISTRY:
        state["next_tool"] = None
    return state


async def tool_executor_node(state: AgentState) -> AgentState:
    """Executes the selected tool and waits for its result before continuing."""
    tool = state.get("next_tool")
    if not tool:
        return state
    fn = TOOL_REGISTRY[tool]
    args = dict(state.get("next_tool_args") or {})
    args["db"] = state["db"]
    args["user_id"] = state["user_id"]
    try:
        result = await fn(**args)
    except TypeError as exc:
        result = {"error": f"invalid arguments for {tool}: {exc}"}
    except Exception as exc:  # noqa: BLE001
        result = {"error": str(exc)}

    actions = state.get("actions_taken", [])
    actions.append({"tool": tool, "args": {k: v for k, v in args.items() if k not in ("db",)}, "result": result})
    state["actions_taken"] = actions
    state["step_count"] = state.get("step_count", 0) + 1
    return state


async def observer_node(state: AgentState) -> AgentState:
    """Decides whether the loop should continue (another tool call) or stop."""
    if state.get("step_count", 0) >= MAX_TOOL_STEPS:
        state["next_tool"] = None
    return state


async def responder_node(state: AgentState) -> AgentState:
    """Generates the final natural-language response summarizing actions taken."""
    system = (
        "You are a productivity agent responding to the user after taking some "
        "actions on their behalf. Summarize what you found/did in 2-4 sentences, "
        "conversational tone, referencing concrete numbers where possible."
    )
    user_content = json.dumps({
        "message": state.get("user_message"),
        "actions_taken": state.get("actions_taken", []),
        "plan": state.get("plan", {}),
    }, default=str)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    try:
        text = await route_llm("chat", messages)
    except LLMProviderError:
        n = len(state.get("actions_taken", []))
        text = (
            f"I took {n} action(s) based on your request: "
            f"{state.get('plan', {}).get('summary', 'updated your plan')}. "
            "(LLM provider unavailable, so this is an automated summary.)"
        )
    state["final_response"] = text
    return state


def should_continue(state: AgentState) -> str:
    if state.get("next_tool") and state.get("step_count", 0) < MAX_TOOL_STEPS:
        return "tool_selector"
    return "responder"


def build_graph():
    """Builds and compiles the LangGraph StateGraph for the agent loop."""
    from langgraph.graph import END, StateGraph

    graph = StateGraph(AgentState)
    graph.add_node("planner", planner_node)
    graph.add_node("tool_selector", tool_selector_node)
    graph.add_node("tool_executor", tool_executor_node)
    graph.add_node("observer", observer_node)
    graph.add_node("responder", responder_node)

    graph.set_entry_point("planner")
    graph.add_conditional_edges("planner", should_continue, {"tool_selector": "tool_selector", "responder": "responder"})
    graph.add_edge("tool_selector", "tool_executor")
    graph.add_edge("tool_executor", "observer")
    graph.add_conditional_edges("observer", should_continue, {"tool_selector": "planner", "responder": "responder"})
    graph.add_edge("responder", END)

    return graph.compile()


_compiled_graph = None


def get_agent_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


async def run_agent(
    db: Database,
    user_id: str,
    user_message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    task_list: Optional[List[Dict[str, Any]]] = None,
    calendar_context: Optional[List[Dict[str, Any]]] = None,
    user_prefs: Optional[Dict[str, Any]] = None,
) -> AgentState:
    graph = get_agent_graph()
    initial_state: AgentState = {
        "user_id": user_id,
        "user_message": user_message,
        "conversation_history": conversation_history or [],
        "task_list": task_list or [],
        "calendar_context": calendar_context or [],
        "user_prefs": user_prefs or {},
        "plan": {},
        "actions_taken": [],
        "next_tool": None,
        "next_tool_args": {},
        "step_count": 0,
        "final_response": "",
        "db": db,
    }
    result = await graph.ainvoke(initial_state)
    return result
