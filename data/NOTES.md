# Data & content: first tasks (@data-placeholder)

1. **Findex data.** Write `scripts/process_findex.py` to turn the World Bank Global Findex dataset into `findex/IN.json`, `KE.json` and `DE.json`. Each indicator needs its topic, its value per group ("young" for student/first_job, "older" for parent/retired), a benchmark and `higher_is_better`. Cite the source.
2. **Country packs.** Create `country_packs/IN.json`, `KE.json` and `DE.json` with currency code and symbol (₹, KSh, €), the currency name as spoken in each language, example amounts by life stage, common local scam patterns and sources.
3. **Lesson templates.** Write `lesson_templates/accounts.json`, `saving.json`, `borrowing.json`, `scams.json` and `budget.json` with `{placeholders}` for facts that code fills in. Every card needs a `voice_template` that teaches the same thing by ear: options read with letters, how to answer, and no "tap", "swipe" or "see".
4. **Question bank.** Create `question_bank/{topic}.json` with at least 2 baseline quiz questions per topic and difficulty, including correct answers and spoken text that reads each option with its letter.
5. **Fixtures.** Add test profiles to `fixtures/` (India student, Kenya parent, Germany first job, and an India voice-mode user), plus one fully written lesson fixture covering every card type with complete `voice` blocks, for the API and app mocks.
