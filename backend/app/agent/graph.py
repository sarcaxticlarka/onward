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

MAX_TOOL_STEPS = 2

# Keywords that signal the user wants a tool action (not just a quick answer)
_TOOL_KEYWORDS = (
    "decompose", "split", "break", "subtask",
    "schedule", "calendar", "event", "conflict",
    "prioritize", "priority", "score", "rank",
    "notify", "notification", "remind",
)


def _needs_tools(message: str) -> bool:
    """Heuristic: does this message require tool use or just a conversational answer?"""
    lowered = message.lower()
    return any(kw in lowered for kw in _TOOL_KEYWORDS)


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
    _fast: bool  # set by router_node: True = skip tool loop
    db: Any  # Database handle (not serialized to sessions table)


TOOL_DESCRIPTIONS = """Available tools:
- calendar_read(days:int): read upcoming calendar events
- calendar_write(title:str, start:str, end:str, description:str): create a calendar event
- task_decompose(task_id:str): break a task into ordered subtasks
- conflict_detect(days:int): find overlaps between task deadlines and calendar events
- task_prioritize(): recompute AI priority scores (0-100) for all open tasks
- send_notification(task_id:str|null): send escalating deadline notification(s)"""


async def fast_respond_node(state: AgentState) -> AgentState:
    """Single-call shortcut for conversational questions that don't need tools.
    Answers directly from task list context — no planner, no tool loop."""
    slim_tasks = [
        {"title": t.get("title"), "priority": t.get("priority"),
         "status": t.get("status"), "deadline": t.get("deadline")}
        for t in (state.get("task_list") or [])[:10]
    ]
    system = (
        "You are a concise productivity assistant for students and professionals. "
        "Answer the user's question in 1-3 sentences using their task/deadline context. "
        "Be direct and specific. Only discuss productivity, tasks, deadlines, and time management."
    )
    user_content = (
        f"Tasks: {json.dumps(slim_tasks, default=str)}\n\n"
        f"Question: {state.get('user_message')}"
    )
    try:
        text = await route_llm("fast", [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_content},
        ])
    except LLMProviderError:
        text = "I'm here to help with your tasks and deadlines. What would you like to know?"
    state["final_response"] = text
    return state


async def planner_node(state: AgentState) -> AgentState:
    """LLM reasons over user input + task list + calendar context to decide
    on a structured plan and whether tools are needed."""
    system = (
        "You are the planning module of an autonomous productivity agent for students and professionals. "
        "You ONLY help with productivity, tasks, scheduling, deadlines, and time management. "
        "Refuse off-topic questions politely.\n"
        f"{TOOL_DESCRIPTIONS}\n"
        "Given the user's message and context, decide on ONE tool to call (or null if you already have enough info). "
        "Be decisive — pick at most one tool per turn. "
        'Return ONLY JSON: {"thought": str, "tool": str|null, "tool_args": {}, "plan_summary": str}. '
        "No prose, no markdown fences, no extra keys."
    )
    # Send only essential task fields to reduce token count
    slim_tasks = [
        {"id": t.get("id"), "title": t.get("title"), "priority": t.get("priority"),
         "status": t.get("status"), "deadline": t.get("deadline")}
        for t in (state.get("task_list") or [])[:15]
    ]
    slim_actions = [
        {"tool": a.get("tool"), "ok": "error" not in (a.get("result") or {})}
        for a in (state.get("actions_taken") or [])
    ]
    user_content = json.dumps({
        "message": state.get("user_message"),
        "tasks": slim_tasks,
        "calendar_event_count": len(state.get("calendar_context") or []),
        "steps_done": state.get("step_count", 0),
        "actions": slim_actions,
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
        "You are a productivity assistant. You only help with tasks, deadlines, scheduling, and time management. "
        "Respond in 2-3 sentences max. Be direct and reference specific numbers/tasks where possible. "
        "If no tools were used, answer the productivity question directly from context."
    )
    # Send slim summary — not full result payloads
    slim_actions = []
    for a in (state.get("actions_taken") or []):
        result = a.get("result") or {}
        summary: dict = {"tool": a.get("tool")}
        if "prioritized" in result:
            summary["prioritized_count"] = len(result["prioritized"])
        elif "subtasks" in result:
            summary["subtask_count"] = len(result["subtasks"])
        elif "conflicts" in result:
            summary["conflicts"] = result["conflicts"]
        elif "error" in result:
            summary["error"] = result["error"]
        slim_actions.append(summary)

    user_content = json.dumps({
        "user_message": state.get("user_message"),
        "actions": slim_actions,
        "plan_summary": state.get("plan", {}).get("summary"),
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


async def router_node(state: AgentState) -> AgentState:
    """Entry node: sets a flag so the next conditional edge can route correctly."""
    state["_fast"] = not _needs_tools(state.get("user_message", ""))
    return state


def route_after_router(state: AgentState) -> str:
    return "fast_respond" if state.get("_fast") else "planner"


def build_graph():
    """Builds and compiles the LangGraph StateGraph for the agent loop."""
    from langgraph.graph import END, StateGraph

    graph = StateGraph(AgentState)
    graph.add_node("router",        router_node)
    graph.add_node("fast_respond",  fast_respond_node)
    graph.add_node("planner",       planner_node)
    graph.add_node("tool_selector", tool_selector_node)
    graph.add_node("tool_executor", tool_executor_node)
    graph.add_node("observer",      observer_node)
    graph.add_node("responder",     responder_node)

    graph.set_entry_point("router")
    graph.add_conditional_edges("router", route_after_router, {
        "fast_respond": "fast_respond",
        "planner": "planner",
    })
    graph.add_edge("fast_respond", END)

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
