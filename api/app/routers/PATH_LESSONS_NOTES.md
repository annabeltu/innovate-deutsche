# Path + Lessons API: first tasks (@faraz999shah)

Files: `routers/path.py`, `routers/lessons.py`, `services/scoring.py`, `services/lesson_builder.py`, `services/voice_script.py`, `services/validation.py`, `llm/client.py`, `prompts/`.

1. **Shared models (with Will).** Add the Path, PathNode, Lesson, card and `voice` block models to `schemas/shared.py` and mirror them in `app/src/types/api.ts`. Every card type must require a `voice` block.
2. **Scoring.** Implement `services/scoring.py`: priority = 0.4 × findex_gap + 0.4 × (1 − proficiency) + 0.2 × goal_match, plus difficulty (1–3) and topic ordering. Cover it with pytest.
3. **Path endpoints.** Build `POST /v1/path` and `GET /v1/path/{user_id}` from `profile_store.get_profile(user_id)`, with a fixture response first so the app can develop against it. Include a spoken `announcement` and a `speak_text` for every node.
4. **Lesson endpoint + LLM layer.** Add `GET /v1/lessons/{lesson_id}?user_id=` and a provider-agnostic `llm/client.py` with a mock used when no `LLM_API_KEY` is set. Pipeline: template → code fills facts → LLM rewrites wording only → voice blocks → validate → cache. Validation must reject voice text that says "tap", "swipe" or "see", and fall back to the filled template on failure.
5. **Ask Kiko + bonus lessons.** Add `POST /v1/ask`, which returns `answer`, `spoken_answer` and a `confirm_prompt` when it suggests a lesson. Add `POST /v1/bonus-lessons`, which generates a 3–4 card lesson playable entirely by voice, adds it to the path and returns a spoken announcement.
