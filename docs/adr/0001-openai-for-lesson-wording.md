# 0001. OpenAI for lesson wording, behind a provider-agnostic client

Date: 2026-10-15
Status: Accepted

## Context

Base lessons are written once in English. Each learner needs their lesson in
their language (English, Spanish or Swahili) and, in simple mode, in simpler
words. AGENTS.md requires that code fills every fact and the LLM rewrites
wording only, with structured output, Pydantic validation, one retry, and a
fallback to the template lesson. Keys must stay in the API.

## Options

- **OpenAI Chat Completions, JSON mode.** Mature, well documented, guarantees
  parseable JSON. JSON mode does not enforce our schema, but we validate every
  reply ourselves anyway.
- **OpenAI strict JSON schema mode.** Enforces the schema server-side, but
  strict mode cannot express our maps keyed by option letter (`options`,
  `spoken_options`) without reshaping the shared contract.
- **Anthropic Claude.** Comparable quality; the team chose OpenAI.
- **No LLM (templates only).** Zero cost and risk, but no translation.

## Decision

Use OpenAI Chat Completions in JSON mode, called with `httpx` from
`app/llm/client.py` (no SDK dependency). Services depend only on the
`LlmClient` protocol, so the provider can be swapped in one file. The model
id is configuration (`LLM_MODEL`), not code. Without `LLM_API_KEY` the API
uses `EchoLlmClient`, and lessons stay in English.

## Consequences

- Every reply goes through `services/validation.py`; replies that change
  cards, answers, difficulty or numbers, or break voice rules, are rejected,
  retried once, then the English lesson is served.
- Refusals, truncated replies (`finish_reason` other than `stop`), timeouts and
  HTTP errors all become `LlmError`, which triggers the same retry and fallback.
- Cost and latency scale with lesson opens until rewritten lessons are cached
  (follow-up: SQLite cache keyed by lesson, language, country and prompt
  version).
- The team must set `LLM_MODEL` to a current OpenAI chat model.
