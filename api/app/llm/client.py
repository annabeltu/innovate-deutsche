"""LLM client (provider-agnostic). Owner: Faraz (@faraz999shah).

The only place that talks to an LLM. Services depend on the LlmClient
protocol, so the provider can be chosen (or swapped) without touching them,
and tests can pass in a fake.
"""

import json
from pathlib import Path
from typing import Protocol

import httpx

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
CHAT_COMPLETIONS_PATH = "/chat/completions"
COMPLETE_FINISH_REASON = "stop"


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


class OpenAiClient:
    """Calls OpenAI Chat Completions in JSON mode.

    JSON mode guarantees parseable JSON; the caller still validates the
    shape and content against the Pydantic schema before using it.
    """

    def __init__(
        self, api_key: str, model_name: str, http_client: httpx.Client
    ) -> None:
        """Create a client.

        Args:
            api_key: OpenAI API key; only ever sent as the auth header.
            model_name: OpenAI chat model id.
            http_client: Client already set up with the base URL and timeout.
        """
        self._api_key = api_key
        self.model_name = model_name
        self._http_client = http_client

    def complete_json(self, instructions: str, request_json: str) -> str:
        """Ask the model for a JSON reply.

        Raises:
            LlmError: On timeout, network or HTTP errors, a refusal, a cut-off
                reply, or a response without content.
        """
        try:
            response = self._http_client.post(
                CHAT_COMPLETIONS_PATH,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=self._request_body(instructions, request_json),
            )
            response.raise_for_status()
        except httpx.TimeoutException as error:
            raise LlmError("OpenAI request timed out") from error
        except httpx.HTTPStatusError as error:
            raise LlmError(
                f"OpenAI returned HTTP {error.response.status_code}"
            ) from error
        except httpx.HTTPError as error:
            raise LlmError(f"OpenAI request failed: {type(error).__name__}") from error
        return _reply_content(response)

    def _request_body(self, instructions: str, request_json: str) -> dict[str, object]:
        """Chat Completions body: system instructions, JSON request, JSON mode."""
        return {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": instructions},
                {"role": "user", "content": request_json},
            ],
            "response_format": {"type": "json_object"},
        }


def _reply_content(response: httpx.Response) -> str:
    """Extract the reply text, rejecting refused or truncated replies."""
    try:
        choice = response.json()["choices"][0]
        message = choice["message"]
    except (ValueError, KeyError, IndexError, TypeError) as error:
        raise LlmError("OpenAI response has no choices") from error
    if not isinstance(choice, dict) or not isinstance(message, dict):
        raise LlmError("OpenAI response has an unexpected shape")
    if message.get("refusal"):
        raise LlmError("OpenAI refused the request")
    if choice.get("finish_reason") != COMPLETE_FINISH_REASON:
        raise LlmError(f"OpenAI reply incomplete: {choice.get('finish_reason')}")
    content = message.get("content")
    if not isinstance(content, str) or not content:
        raise LlmError("OpenAI reply has no content")
    return content


def load_prompt(file_name: str) -> str:
    """Read a versioned prompt file from app/prompts."""
    return (PROMPTS_DIR / file_name).read_text(encoding="utf-8")
