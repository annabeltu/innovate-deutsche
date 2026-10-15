"""LLM client (provider-agnostic). Owner: Faraz (@faraz999shah).

The only place that talks to an LLM. Services depend on the LlmClient
protocol, so the provider can be chosen (or swapped) without touching them,
and tests can pass in a fake.
"""

import json
from pathlib import Path
from typing import Protocol

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class LlmError(Exception):
    """The LLM call failed or timed out; callers retry or fall back."""


class LlmClient(Protocol):
    """Anything that can answer a request with structured JSON."""

    model_name: str

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Send instructions and a JSON request; return the model's JSON text.

        Raises:
            LlmError: If the call fails or times out.
        """
        ...


class EchoLlmClient:
    """Stand-in used when no LLM_API_KEY is set: returns the lesson unchanged.

    Keeps the whole lesson pipeline working in local development and demos
    without a key; lessons simply stay in their original wording.
    """

    model_name = "echo"

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Return the request's lesson as-is."""
        return json.dumps(json.loads(request_json)["lesson"])


def load_prompt(file_name: str) -> str:
    """Read a versioned prompt file from app/prompts."""
    return (PROMPTS_DIR / file_name).read_text(encoding="utf-8")
