"""
backend/tests/test_llm_gateway.py — Smoke tests for multi-provider LLM Gateway.

Tests:
  1. Success on first provider: verifies correct content and provider name.
  2. Fallback on 429 RateLimitError: verifies automatic progression to second provider.
  3. All providers failing: verifies clear RuntimeError raised.
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import openai
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import ProviderConfig, Settings
from app.llm_gateway import chat_completion


@pytest.fixture
def mock_settings():
    """Mock Settings with test providers and valid API keys."""
    return Settings(
        demo_mode=False,
        dataset_version="v1",
        llm_providers=["openrouter", "gemini", "groq", "ollama"],
        openrouter_api_key="test-openrouter-key",
        gemini_api_key="test-gemini-key",
        groq_api_key="test-groq-key",
        ollama_base_url="http://localhost:11434/v1",
        providers={
            "openrouter": ProviderConfig(
                base_url="https://openrouter.ai/api/v1",
                model="meta-llama/llama-3.1-8b-instruct:free",
                api_key_env="OPENROUTER_API_KEY",
                timeout_s=10.0,
            ),
            "gemini": ProviderConfig(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                model="gemini-1.5-flash",
                api_key_env="GEMINI_API_KEY",
                timeout_s=10.0,
            ),
            "groq": ProviderConfig(
                base_url="https://api.groq.com/openai/v1",
                model="llama-3.1-8b-instant",
                api_key_env="GROQ_API_KEY",
                timeout_s=10.0,
            ),
            "ollama": ProviderConfig(
                base_url="http://localhost:11434/v1",
                model="llama3.2",
                api_key_env="OLLAMA_API_KEY",
                timeout_s=10.0,
            ),
        },
    )


def _create_mock_response(content: str):
    """Helper to build a mock OpenAI chat completion response."""
    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_resp.choices = [mock_choice]
    return mock_resp


@pytest.mark.anyio
async def test_gateway_success_first_provider(mock_settings, monkeypatch):
    """Test 1: Mocks AsyncOpenAI to return a fake response for the first provider."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")

    mock_resp = _create_mock_response("PMMA flame spread analysis in microgravity.")

    with patch("app.llm_gateway.get_settings", return_value=mock_settings):
        with patch("app.llm_gateway.AsyncOpenAI") as mock_client_cls:
            mock_client_instance = MagicMock()
            mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client_instance

            result = await chat_completion(
                messages=[{"role": "user", "content": "Analyze PMMA risk."}],
                temperature=0.2,
                use_cache=False,
            )

            assert result["content"] == "PMMA flame spread analysis in microgravity."
            assert result["provider"] == "openrouter"
            assert result["model"] == "meta-llama/llama-3.1-8b-instruct:free"
            assert result["cached"] is False
            assert "latency_ms" in result


@pytest.mark.anyio
async def test_gateway_fallback_on_429(mock_settings, monkeypatch):
    """Test 2: Mocks first provider returning 429, asserts gateway falls through to second provider."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    fake_request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    fake_response = httpx.Response(429, request=fake_request)
    rate_limit_error = openai.RateLimitError(
        message="429 Rate limit exceeded on OpenRouter free tier",
        response=fake_response,
        body={"error": "rate limit"},
    )

    gemini_resp = _create_mock_response("Gemini fallback: SIBAL fabric ignited steadily.")

    with patch("app.llm_gateway.get_settings", return_value=mock_settings):
        with patch("app.llm_gateway.AsyncOpenAI") as mock_client_cls:
            mock_client_openrouter = MagicMock()
            mock_client_openrouter.chat.completions.create = AsyncMock(side_effect=rate_limit_error)

            mock_client_gemini = MagicMock()
            mock_client_gemini.chat.completions.create = AsyncMock(return_value=gemini_resp)

            # Return different mock client depending on base_url
            def client_factory(base_url, **kwargs):
                if "openrouter" in base_url:
                    return mock_client_openrouter
                elif "generativelanguage" in base_url:
                    return mock_client_gemini
                return MagicMock()

            mock_client_cls.side_effect = client_factory

            result = await chat_completion(
                messages=[{"role": "user", "content": "Evaluate SIBAL fabric."}],
                temperature=0.2,
                use_cache=False,
            )

            assert result["content"] == "Gemini fallback: SIBAL fabric ignited steadily."
            assert result["provider"] == "gemini"
            assert result["model"] == "gemini-1.5-flash"


@pytest.mark.anyio
async def test_gateway_all_providers_fail(mock_settings, monkeypatch):
    """Test 3: When all configured providers fail, a clear RuntimeError is raised."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "key1")
    monkeypatch.setenv("GEMINI_API_KEY", "key2")
    monkeypatch.setenv("GROQ_API_KEY", "key3")
    monkeypatch.setenv("OLLAMA_API_KEY", "key4")

    fake_request = httpx.Request("POST", "https://api.test")
    fake_response = httpx.Response(500, request=fake_request)
    server_error = openai.InternalServerError(
        message="Internal server error",
        response=fake_response,
        body={"error": "server error"},
    )

    with patch("app.llm_gateway.get_settings", return_value=mock_settings):
        with patch("app.llm_gateway.AsyncOpenAI") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.chat.completions.create = AsyncMock(side_effect=server_error)
            mock_client_cls.return_value = mock_client

            with pytest.raises(RuntimeError) as exc_info:
                await chat_completion(
                    messages=[{"role": "user", "content": "Test fail"}],
                    use_cache=False,
                )

            assert "All LLM providers failed" in str(exc_info.value)
