"""
backend/app/config.py — Configuration loader for AegnyxZero.

Loads environment variables from .env and provider definitions from backend/config/llm.yaml.
Exposes get_settings() returning a Pydantic settings object.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Optional
import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Resolve directory paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env"
LLM_YAML_PATH = BACKEND_DIR / "config" / "llm.yaml"

# Load .env file from project root if present
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
else:
    load_dotenv(override=True)


class ProviderConfig(BaseModel):
    base_url: str
    model: str
    api_key_env: str
    timeout_s: float = 30.0


class Settings(BaseModel):
    demo_mode: bool = False
    dataset_version: str = "v1"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"
    openrouter_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434/v1"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    llm_providers: list[str] = Field(
        default_factory=lambda: ["openrouter", "gemini", "groq", "ollama"]
    )
    providers: dict[str, ProviderConfig] = Field(default_factory=dict)

    def get_api_key_for_provider(self, provider_name: str) -> Optional[str]:
        """Retrieve the API key for a given provider from environment or settings."""
        prov = self.providers.get(provider_name)
        if not prov:
            return None
        env_var_name = prov.api_key_env
        return os.getenv(env_var_name, "").strip()


def load_providers_yaml() -> dict[str, ProviderConfig]:
    """Parse backend/config/llm.yaml into a dictionary of ProviderConfig."""
    if not LLM_YAML_PATH.exists():
        return {}
    with open(LLM_YAML_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return {k: ProviderConfig(**v) for k, v in data.items()}


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    # Parse LLM providers list from env if defined
    providers_env = os.getenv("LLM_PROVIDERS", "openrouter,gemini,groq,ollama")
    providers_list = [p.strip() for p in providers_env.split(",") if p.strip()]

    providers_cfg = load_providers_yaml()

    # If ollama base_url is overridden in env, update provider config
    ollama_env_url = os.getenv("OLLAMA_BASE_URL")
    if ollama_env_url and "ollama" in providers_cfg:
        providers_cfg["ollama"].base_url = ollama_env_url

    demo_mode_val = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")

    return Settings(
        demo_mode=demo_mode_val,
        dataset_version=os.getenv("DATASET_VERSION", "v1"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        cors_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173"),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"),
        llm_providers=providers_list,
        providers=providers_cfg,
    )
