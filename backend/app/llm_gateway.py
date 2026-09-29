"""
backend/app/llm_gateway.py — Multi-provider LLM Gateway with fallback and disk caching.

Implements PRD Section 14.3:
  1. Ordered provider fallback: openrouter → gemini → groq → ollama
  2. Handles 429, 5xx, timeouts, and connection errors by trying the next provider
  3. Caches successful completions to disk via SQLite
  4. Returns standard dictionary: {"content": ..., "provider": ..., "model": ..., "latency_ms": ...}
"""

import hashlib
import json
import logging
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional
import openai
from openai import AsyncOpenAI

from .config import get_settings, ProviderConfig

logger = logging.getLogger("llm_gateway")

# Database cache path
BACKEND_DIR = Path(__file__).resolve().parent.parent
CACHE_DB_PATH = BACKEND_DIR / "llm_cache.db"


def _init_cache_db():
    """Ensure the SQLite cache table exists."""
    with sqlite3.connect(CACHE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS llm_cache (
                cache_key TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                content TEXT NOT NULL,
                latency_ms INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def _get_cache_key(messages: list[dict], model: str, temperature: float) -> str:
    """Generate a deterministic SHA-256 hash for messages and model params."""
    payload = {
        "messages": messages,
        "model": model,
        "temperature": temperature,
    }
    dumped = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(dumped.encode("utf-8")).hexdigest()


def _lookup_cache(cache_key: str) -> Optional[dict[str, Any]]:
    """Look up a cached completion by key."""
    start_lookup = time.perf_counter()
    try:
        _init_cache_db()
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT content, provider, model, latency_ms FROM llm_cache WHERE cache_key = ?",
                (cache_key,),
            )
            row = cursor.fetchone()
            if row and row[0] and row[0].strip():
                lookup_ms = max(1, int((time.perf_counter() - start_lookup) * 1000))
                return {
                    "content": row[0],
                    "provider": row[1],
                    "model": row[2],
                    "latency_ms": lookup_ms,
                    "cached": True,
                }
    except Exception as e:
        logger.warning(f"Cache lookup failed: {e}")
    return None


def _write_cache(cache_key: str, provider: str, model: str, content: str, latency_ms: int):
    """Save a successful completion to SQLite cache."""
    if not content or not content.strip():
        return
    try:
        _init_cache_db()
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO llm_cache (cache_key, provider, model, content, latency_ms)
                VALUES (?, ?, ?, ?, ?)
                """,
                (cache_key, provider, model, content, latency_ms),
            )
            conn.commit()
    except Exception as e:
        logger.warning(f"Writing to LLM cache failed: {e}")


async def chat_completion(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: Optional[int] = 2500,
    use_cache: bool = True,
) -> dict:
    """
    Execute chat completion across ordered LLM providers with automatic fallback.

    Args:
        messages: List of message dicts (e.g. [{"role": "user", "content": "..."}])
        temperature: Sampling temperature (default 0.2 for deterministic QA)
        max_tokens: Optional token output limit (defaults to 1500 for safety and free tier support)
        use_cache: Whether to check/store in SQLite disk cache

    Returns:
        dict: {"content": str, "provider": str, "model": str, "latency_ms": int, "cached": bool}

    Raises:
        RuntimeError: If all configured providers fail or lack valid credentials.
    """
    settings = get_settings()
    providers_order = settings.llm_providers
    errors: dict[str, str] = {}
    attempted: list[str] = []

    for provider_name in providers_order:
        provider_cfg: Optional[ProviderConfig] = settings.providers.get(provider_name)
        if not provider_cfg:
            logger.warning(f"Provider '{provider_name}' requested but not defined in config/llm.yaml.")
            continue

        # Check API key requirement
        api_key = settings.get_api_key_for_provider(provider_name)
        if provider_name == "ollama":
            # Local Ollama does not require an API key; AsyncOpenAI requires a non-empty string
            api_key = api_key or "ollama"
        elif not api_key:
            logger.warning(
                f"Skipping provider '{provider_name}': API key environment variable "
                f"'{provider_cfg.api_key_env}' is missing or empty."
            )
            errors[provider_name] = f"Missing API key ({provider_cfg.api_key_env})"
            continue

        attempted.append(provider_name)

        # Check cache if enabled
        cache_key = _get_cache_key(messages, provider_cfg.model, temperature)
        if use_cache:
            cached_result = _lookup_cache(cache_key)
            if cached_result:
                logger.info(f"Returning cached response for provider '{provider_name}' ({provider_cfg.model})")
                return cached_result

        # Call provider via AsyncOpenAI
        client = AsyncOpenAI(
            base_url=provider_cfg.base_url,
            api_key=api_key,
            timeout=provider_cfg.timeout_s,
        )

        start_time = time.perf_counter()
        try:
            logger.info(f"Calling LLM provider '{provider_name}' with model '{provider_cfg.model}'...")
            kwargs = {
                "model": provider_cfg.model,
                "messages": messages,
                "temperature": temperature,
            }
            if max_tokens is not None:
                kwargs["max_tokens"] = max_tokens

            response = await client.chat.completions.create(**kwargs)

            latency_ms = int((time.perf_counter() - start_time) * 1000)
            content = ""
            if response.choices and response.choices[0].message:
                content = response.choices[0].message.content or ""

            if not content.strip():
                raise ValueError(f"Provider '{provider_name}' returned empty response content.")

            if content.strip().startswith("User Safety:") or content.strip() == "User Safety: safe":
                raise ValueError(f"Provider '{provider_name}' returned safety refusal string: {content.strip()}")

            # Cache successful response
            if use_cache:
                _write_cache(cache_key, provider_name, provider_cfg.model, content, latency_ms)

            return {
                "content": content,
                "provider": provider_name,
                "model": provider_cfg.model,
                "latency_ms": latency_ms,
                "cached": False,
            }

        except (
            openai.RateLimitError,
            openai.APIStatusError,
            openai.APITimeoutError,
            openai.APIConnectionError,
            Exception,
        ) as err:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            err_msg = f"{type(err).__name__}: {str(err)}"
            logger.warning(
                f"Provider '{provider_name}' failed after {latency_ms}ms with error: {err_msg}. "
                "Attempting fallback to next provider..."
            )
            errors[provider_name] = err_msg

    # All providers failed
    raise RuntimeError(
        f"All LLM providers failed. Attempted: {attempted}. "
        f"Errors: {json.dumps(errors, indent=2)}"
    )
