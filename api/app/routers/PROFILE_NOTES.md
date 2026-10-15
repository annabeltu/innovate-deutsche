# LearnerProfile API: first tasks (@willapat)

Files: `routers/profile.py`, `services/profile_store.py`.

1. **Shared models (with Faraz).** Add LearnerProfile, Accessibility, TopicScore, onboarding and quiz models plus the enums to `schemas/shared.py`, and mirror them in `app/src/types/api.ts`.
2. **Profile store.** Implement `services/profile_store.py` on SQLite with `get_profile(user_id) -> LearnerProfile`. This is the only interface Faraz's API calls.
3. **Onboarding + quiz.** Build `POST /v1/onboarding`, which returns a 10-question baseline quiz (2 per topic) with the answer key kept server-side. Every question needs a `speak_text` that reads the question and every option with its letter. Add `POST /v1/quiz/{quiz_id}/submit` (409 on a repeat submit) and `POST /v1/quiz/{quiz_id}/skip`. proficiency = 0.4 × confidence + 0.6 × quiz_score, or confidence alone when the quiz is skipped.
4. **Profile + accessibility.** Build `GET /v1/profile/{user_id}` and `PATCH /v1/profile/{user_id}/accessibility`, so voice mode, read aloud, simple mode, large text and speech rate can be switched at any time, by voice or by tap.
5. **Lesson results.** Build `POST /v1/profile/{user_id}/lesson-results`: new proficiency = 0.5 × old + 0.5 × correct/total, and return `path_refresh_needed`. Add pytest coverage for every endpoint, including the error shape.
