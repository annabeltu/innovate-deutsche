"""Tests for the OpenAI client and LLM client selection; no real API calls."""

import json
from collections.abc import Callable

import httpx
import pytest
from pydantic import SecretStr

from app.config import Settings
from app.dependencies import get_llm_client
from app.llm.client import EchoLlmClient, LlmError, OpenAiClient

API_KEY = "sk-test"
MODEL = "test-model"
BASE_URL = "https://llm.test/v1"
REPLY = '{"title": "Hola"}'

Handler = Callable[[httpx.Request], httpx.Response]


def openai_client(
    handler: Handler, reasoning_effort: str | None = None
) -> OpenAiClient:
    """An OpenAiClient whose HTTP calls go to handler instead of the network."""
    http_client = httpx.Client(
        base_url=BASE_URL, transport=httpx.MockTransport(handler)
    )
    return OpenAiClient(API_KEY, MODEL, http_client, reasoning_effort)


def chat_reply(
    content: str | None = REPLY, finish_reason: str = "stop", refusal: str | None = None
) -> httpx.Response:
    """A Chat Completions response with one choice."""
    message = {"role": "assistant", "content": content, "refusal": refusal}
    return httpx.Response(
        200, json={"choices": [{"message": message, "finish_reason": finish_reason}]}
    )


def test_sends_instructions_and_request_in_json_mode() -> None:
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return chat_reply()

    reply = openai_client(handler).complete_json("Rewrite it.", '{"lesson": {}}')

    assert reply == REPLY
    request = sent[0]
    assert request.url == f"{BASE_URL}/chat/completions"
    assert request.headers["Authorization"] == f"Bearer {API_KEY}"
    body = json.loads(request.content)
    assert body["model"] == MODEL
    assert body["response_format"] == {"type": "json_object"}
    assert body["messages"] == [
        {"role": "system", "content": "Rewrite it."},
        {"role": "user", "content": '{"lesson": {}}'},
    ]


def raise_timeout(request: httpx.Request) -> httpx.Response:
    raise httpx.ReadTimeout("slow", request=request)


def raise_network_error(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("down", request=request)


@pytest.mark.parametrize(
    ("handler", "message"),
    [
        (raise_timeout, "timed out"),
        (raise_network_error, "ConnectError"),
        (lambda request: httpx.Response(500), "HTTP 500"),
        (lambda request: httpx.Response(429), "HTTP 429"),
        (lambda request: httpx.Response(200, text="not json"), "no choices"),
        (lambda request: httpx.Response(200, json={"choices": []}), "no choices"),
        (lambda request: httpx.Response(200, json={"choices": ["x"]}), "no choices"),
        (lambda request: chat_reply(finish_reason="length"), "incomplete: length"),
        (lambda request: chat_reply(refusal="I can't help"), "refused"),
        (lambda request: chat_reply(content=None), "no content"),
    ],
)
def test_turns_every_failure_into_llm_error(handler: Handler, message: str) -> None:
    with pytest.raises(LlmError, match=message):
        openai_client(handler).complete_json("Rewrite it.", "{}")


def test_error_messages_never_contain_the_api_key() -> None:
    with pytest.raises(LlmError) as error:
        openai_client(lambda request: httpx.Response(401)).complete_json("x", "{}")

    assert API_KEY not in str(error.value)


@pytest.mark.parametrize("api_key", [None, ""])
def test_uses_echo_client_without_a_key(api_key: str | None) -> None:
    settings = Settings(llm_api_key=None if api_key is None else SecretStr(api_key))

    assert isinstance(get_llm_client(settings), EchoLlmClient)


def test_uses_openai_client_with_key_and_model() -> None:
    settings = Settings(llm_api_key=SecretStr(API_KEY), llm_model=MODEL)

    client = get_llm_client(settings)

    assert isinstance(client, OpenAiClient)
    assert client.model_name == MODEL


def test_requires_a_model_when_a_key_is_set() -> None:
    settings = Settings(llm_api_key=SecretStr(API_KEY), llm_model="")

    with pytest.raises(ValueError, match="LLM_MODEL"):
        get_llm_client(settings)


@pytest.mark.parametrize("reasoning_effort", [None, "low"])
def test_sends_reasoning_effort_only_when_set(reasoning_effort: str | None) -> None:
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return chat_reply()

    openai_client(handler, reasoning_effort).complete_json("Rewrite it.", "{}")

    body = json.loads(sent[0].content)
    assert body.get("reasoning_effort") == reasoning_effort


def test_passes_reasoning_effort_from_settings() -> None:
    settings = Settings(
        llm_api_key=SecretStr(API_KEY), llm_model=MODEL, llm_reasoning_effort="low"
    )

    client = get_llm_client(settings)

    assert isinstance(client, OpenAiClient)
    assert client._reasoning_effort == "low"
