"""Application settings, read once from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Every config value the API reads. Override any field with an env var of the same name."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_path: Path = Path("kompass.db")
    question_bank_dir: Path = REPO_ROOT / "data" / "question_bank"
    lesson_templates_dir: Path = REPO_ROOT / "data" / "lesson_templates"
    findex_dir: Path = REPO_ROOT / "data" / "findex"
    # Local-only test pages under /dev; off unless explicitly enabled.
    dev_tools_enabled: bool = False
    # LLM (OpenAI). With no key, lessons keep their original English wording.
    llm_api_key: SecretStr | None = None
    llm_model: str | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_timeout_seconds: float = Field(default=20.0, gt=0)
    # Optional reasoning effort for reasoning models, e.g. "low"; unset sends none.
    llm_reasoning_effort: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings; tests override this with dependency_overrides."""
    return Settings()
