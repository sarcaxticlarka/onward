"""LLM Router: routes requests to Groq / Claude / GPT-4o based on task type.

Usage:
    text = await route_llm("deadline_parse", [{"role": "user", "content": "..."}])

Routing table (see project.md section 3.2 / 7.2):
    - fast / deadline_parse / classification  -> Groq (LLaMA 3) for speed
    - reasoning / decomposition / planning     -> Claude (Sonnet) for quality
    - vision / voice                           -> GPT-4o

Each provider call is isolated so a missing API key or a provider outage
degrades gracefully (raises LLMProviderError with a clear message) instead
of crashing the process.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from app.core.config import get_settings

settings = get_settings()


class TaskType(str, Enum):
    FAST = "fast"
    DEADLINE_PARSE = "deadline_parse"
    CLASSIFICATION = "classification"
    REASONING = "reasoning"
    DECOMPOSITION = "decomposition"
    PLANNING = "planning"
    VISION = "vision"
    VOICE = "voice"
    CHAT = "chat"


# Route everything to Groq — it's the only key configured and it's the fastest
_GROQ_TASKS = {
    TaskType.FAST, TaskType.DEADLINE_PARSE, TaskType.CLASSIFICATION,
    TaskType.REASONING, TaskType.DECOMPOSITION, TaskType.PLANNING, TaskType.CHAT,
}
_CLAUDE_TASKS: set = set()
_OPENAI_TASKS = {TaskType.VISION, TaskType.VOICE}


class LLMProviderError(RuntimeError):
    """Raised when an LLM provider call cannot be completed (missing key, API error)."""


def _provider_for(task_type: str) -> str:
    try:
        tt = TaskType(task_type)
    except ValueError:
        tt = TaskType.CHAT
    if tt in _GROQ_TASKS:
        return "groq"
    if tt in _OPENAI_TASKS:
        return "openai"
    return "anthropic"


async def _call_groq(messages: List[dict], model: str = "llama-3.3-70b-versatile") -> str:
    if not settings.GROQ_API_KEY:
        raise LLMProviderError("GROQ_API_KEY is not configured. Set it in .env to enable fast LLM routing.")
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    try:
        resp = await client.chat.completions.create(model=model, messages=messages)
        return resp.choices[0].message.content or ""
    except Exception as exc:  # noqa: BLE001
        raise LLMProviderError(f"Groq call failed: {exc}") from exc


async def _call_claude(messages: List[dict], model: str = "claude-sonnet-4-5-20250929") -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise LLMProviderError("ANTHROPIC_API_KEY is not configured. Set it in .env to enable Claude reasoning.")
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    system = "\n".join(m["content"] for m in messages if m.get("role") == "system") or None
    convo = [m for m in messages if m.get("role") != "system"]
    if not convo:
        convo = [{"role": "user", "content": "Hello"}]
    try:
        resp = await client.messages.create(
            model=model,
            max_tokens=2048,
            system=system,
            messages=convo,
        )
        return "".join(block.text for block in resp.content if hasattr(block, "text"))
    except Exception as exc:  # noqa: BLE001
        raise LLMProviderError(f"Claude call failed: {exc}") from exc


async def _call_openai(messages: List[dict], model: str = "gpt-4o") -> str:
    if not settings.OPENAI_API_KEY:
        raise LLMProviderError("OPENAI_API_KEY is not configured. Set it in .env to enable GPT-4o vision/voice.")
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    try:
        resp = await client.chat.completions.create(model=model, messages=messages)
        return resp.choices[0].message.content or ""
    except Exception as exc:  # noqa: BLE001
        raise LLMProviderError(f"OpenAI call failed: {exc}") from exc


async def route_llm(
    task_type: str,
    messages: List[dict],
    model: Optional[str] = None,
    fallback: bool = True,
) -> str:
    """Route `messages` to the best-suited provider for `task_type`.

    If the primary provider fails (missing key / API error) and `fallback`
    is True, tries the other configured providers in order before raising.
    """
    provider = _provider_for(task_type)
    order = [provider] + [p for p in ("groq", "anthropic", "openai") if p != provider]
    if not fallback:
        order = [provider]

    last_error: Optional[Exception] = None
    for p in order:
        try:
            if p == "groq":
                return await _call_groq(messages, model=model or "llama-3.3-70b-versatile")
            if p == "anthropic":
                return await _call_claude(messages, model=model or "claude-sonnet-4-5-20250929")
            if p == "openai":
                return await _call_openai(messages, model=model or "gpt-4o")
        except LLMProviderError as exc:
            last_error = exc
            continue
    raise LLMProviderError(
        f"All LLM providers unavailable for task_type={task_type!r}. Last error: {last_error}"
    )


async def route_llm_safe(task_type: str, messages: List[dict], model: Optional[str] = None) -> Optional[str]:
    """Like route_llm but returns None instead of raising, for non-critical paths."""
    try:
        return await route_llm(task_type, messages, model=model)
    except LLMProviderError:
        return None
