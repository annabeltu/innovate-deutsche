# AGENTS.md — Kompass Engineering Standards

> **Every contributor and every AI coding agent MUST follow this file.**
> If a request conflicts with these rules, follow the rules and tell the requester why.
> We are evaluated on **SDLC discipline**, **code maintainability**, and **choosing the right technology**. Every commit, branch, and PR is evidence.

Read with: [`README.md`](README.md) (team, branch owners, accessibility rules), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md), [`CODEOWNERS`](CODEOWNERS).
When working inside `app/`, **also follow [`app/AGENTS.md`](app/AGENTS.md)** (Expo-specific rules: always check the docs for the installed SDK version, `npx expo install`, never hand-edit `ios/`/`android/`).

---

## 0. Approved Tech Stack

Monorepo: **`api/`** (FastAPI, Python 3.11), **`app/`** (Expo React Native, TypeScript), **`data/`** (Findex, country packs, templates), **`docs/`**.
**Use these tools. Do not introduce an alternative for the same job** (e.g., no Redux, MobX, axios, styled-components, Flask, Django) without an accepted ADR (§6).

### App (`app/`)

| Layer          | Tool                                          | Purpose                                                        |
|----------------|-----------------------------------------------|----------------------------------------------------------------|
| Framework      | React Native + **Expo** (TypeScript)          | Cross-platform app; live demo on a real phone via Expo Go      |
| Navigation     | **Expo Router**                               | File-based screens: setup, onboarding, path, lesson, ask, shop |
| Styling        | **NativeWind** (Tailwind for RN)              | Brand tokens from `src/theme/tokens.ts`                        |
| Animation      | **Reanimated** + **Lottie**                   | Pulsing nodes, coin bursts, confetti, Kiko's spinning needle   |
| Roadmap        | **react-native-svg**                          | Winding path and nodes over the regional background            |
| Sliders        | **@react-native-community/slider**            | Onboarding confidence sliders                                  |
| Read-aloud     | **expo-speech**                               | Multilingual text-to-speech, voice mode                        |
| Voice record   | **expo-audio**                                | Records "Ask Kiko" and voice-mode replies                      |
| i18n           | **i18next** (+ react-i18next)                 | English, Spanish, Swahili                                      |
| Client state   | **Zustand** + `persist` with **AsyncStorage** | Coins, streak, hearts, progress survive restarts               |
| Server state   | **TanStack Query** (with `fetch`)             | Caching, loading states, retries for API calls                 |
| Testing        | **Jest** (`jest-expo`) + **React Native Testing Library** | Unit and component tests                           |

### API (`api/`)

| Layer           | Tool                                   | Purpose                                                         |
|-----------------|----------------------------------------|-----------------------------------------------------------------|
| API             | **FastAPI** + **Pydantic v2**          | Every request/response validated against `schemas/shared.py`    |
| Data            | **pandas** → JSON (scripts only)       | Findex and country packs preprocessed once into `data/`         |
| Personalization | Plain Python scoring + templates       | Deterministic, testable, explainable (`services/scoring.py`)    |
| AI              | LLM API with **structured output**     | Rewrites lesson wording / builds bonus lessons (`llm/client.py`) |
| Speech-to-text  | **Whisper API** (server-side)          | Transcribes Ask Kiko + voice-mode audio; RN has no built-in STT |
| Storage/cache   | **SQLite**                             | Learner profiles and pre-generated demo lessons                 |
| HTTP client     | **httpx**                              | Outbound calls (LLM, Whisper)                                   |
| Tooling         | `pip` + `requirements.txt`, **Ruff**, **pytest** | Deps, format+lint, tests                              |

---

## 1. Git Workflow

The team's branch strategy (from the README):

```
feature/<owner>-<area>  ──PR──▶  dev  ──PR (before demo)──▶  main
```

- **Never commit or push directly to `main` or `dev`.** Everything goes through a Pull Request.
- PRs target **`dev`**. `dev` is merged into `main` via PR before the demo; `main` must always be demoable.
- Pull `dev` into your branch often (`git pull origin dev`) to avoid big conflicts. Never force-push `main`/`dev`; on your own branch use `--force-with-lease` only.
- Keep PRs small (< ~400 changed lines) and focused on one area.

### 1.1 Branch Names

Each owner has a long-lived branch (see README → Team). For any other piece of work, create a short-lived branch:

Format: `<type>/<short-kebab-case-description>`

| Type        | Use for                                 | Example                                   |
|-------------|-----------------------------------------|-------------------------------------------|
| `feature/`  | New feature (owner branches use this)   | `feature/will-learner-profile`, `feature/ask-kiko-recording` |
| `fix/`      | Bug fix                                 | `fix/streak-reset-on-restart`             |
| `docs/`     | Documentation only                      | `docs/api-setup-guide`                    |
| `refactor/` | Code change with no behavior change     | `refactor/extract-loan-math`              |
| `test/`     | Adding or fixing tests                  | `test/scoring-edge-cases`                 |
| `chore/`    | Tooling, deps, config                   | `chore/add-nativewind`                    |
| `ci/`       | CI/CD pipeline changes                  | `ci/api-pytest-workflow`                  |
| `hotfix/`   | Urgent fix to `main` right before demo  | `hotfix/lesson-screen-crash`              |

Rules: lowercase only, hyphens (no spaces/underscores/camelCase), ≤ 50 chars, describes the work (❌ `test2`, ❌ `fixes`, ❌ `my-branch`).

### 1.2 Commit Messages — [Conventional Commits 1.0.0](https://www.conventionalcommits.org/)

```
<type>(<scope>): <subject>

<optional body: WHAT changed and WHY, wrapped at 72 chars>

<optional footer: Closes #12 / BREAKING CHANGE: ...>
```

**Types:** `feat`, `fix`, `docs`, `style` (formatting only), `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes (use one of these):**

| App (`app/`)                                                                 | API (`api/`)                                                         | Shared                                     |
|------------------------------------------------------------------------------|----------------------------------------------------------------------|--------------------------------------------|
| `app`, `onboarding`, `path`, `lesson`, `ask`, `shop`, `setup`, `i18n`, `store`, `theme`, `anim`, `a11y` | `api`, `profile`, `lessons`, `scoring`, `llm`, `prompts`, `voice`, `stt` | `contracts`, `data`, `deps`, `ci`, `docs`, `repo` |

**Subject rules:**
- Imperative mood, as if completing "This commit will…": `add`, not `added`/`adds`
- Lowercase first letter, **no trailing period**, ≤ 72 chars (aim for 50)
- Breaking changes (e.g., changing a shared contract shape): add `!` after type/scope **and** a `BREAKING CHANGE:` footer

**Good:**
```
feat(ask): record question with expo-audio and send to /v1/voice/transcribe
feat(scoring): weight topics by onboarding confidence sliders
fix(store): persist hearts across app restarts
feat(i18n): add swahili translations for onboarding
test(scoring): cover loan interest edge cases
chore(deps): add react-native-svg
feat(contracts)!: rename LessonCard.body to LessonCard.steps

BREAKING CHANGE: app must read card.steps instead of card.body.
```

**Bad:** `update`, `fixed stuff`, `WIP`, `asdf`, `Final version`, `Added login.`, `changes per review`

**Atomic commits:** one logical change per commit. Don't mix a refactor, a feature, and formatting in one commit. Code must run and tests must pass at every commit.

### 1.3 Pull Requests

- **Title:** Conventional Commit format: `feat(path): draw roadmap nodes with react-native-svg`
- **Body:** fill in **every section of [`.github/pull_request_template.md`](.github/pull_request_template.md)**, including the accessibility checklist. Add screenshots/recordings for UI changes.
- **Reviews:** at least **1 approval** before merge; CODEOWNERS are requested automatically. **Shared contract changes** (`api/app/schemas/shared.py`, `app/src/types/api.ts`, `docs/API_CONTRACTS.md`) need approval from **both** @faraz999shah and @willapat, and all three files must change in the same PR.
- **Merge:** short-lived branches use **Squash and merge** (PR title becomes the commit). Long-lived owner branches use **Create a merge commit**.
- CI must be green. Address every review comment (fix it or reply with reasoning). Delete short-lived branches after merge.

---

## 2. Code Standards

### 2.1 Universal Rules

- **Use the standard formatter and linter (§2.2, §2.3).** Do not hand-format, and do not argue style in reviews. The tool decides.
- **Naming:** descriptive, intention-revealing names. No single letters (except loop indices), no unclear abbreviations, no `data2`/`temp`/`foo`.
- **Functions:** do one thing; aim for < 30 lines; ≤ 3–4 parameters (use an object/model beyond that).
- **Files/modules:** single responsibility; aim for < 300 lines.
- **DRY, but not prematurely:** extract on the third duplication.
- **No magic numbers/strings:** use named constants, enums, or theme tokens.
- **Comments explain *why*, not *what*.** Every exported function/component/class gets a JSDoc/docstring.
- **Error handling:** never swallow exceptions silently. Fail fast, log with context, return meaningful errors. Validate all external input at the boundary.
- **No dead code, commented-out code, `console.log`/`print` debugging, or TODOs without an issue link** (`// TODO(#34): ...`).
- **Configuration via environment variables.** Add new keys to `.env.example`; **never commit `.env`, keys, or tokens.**

### 2.2 App — TypeScript / React Native / Expo (`app/`)

**Tooling:** Prettier (with `prettier-plugin-tailwindcss`) + ESLint (`npx expo lint`) + `tsc --noEmit` with `"strict": true`.

**Naming:** `camelCase` variables/functions/hooks (`useLessonProgress`), `PascalCase` components/types (`RoadmapNode.tsx`), `UPPER_SNAKE_CASE` constants, `kebab-case` for non-component files (`api-client.ts`). Route files follow Expo Router conventions (`lesson/[id].tsx`, `_layout.tsx`, `(onboarding)/`).

**Rules:**
- **TypeScript strict; no `any`** (use `unknown` + narrowing). Function components + hooks only.
- **Route files stay thin:** they compose components and hooks. No business logic, fetch calls, or large JSX trees in route files.
- **Styling:** NativeWind `className`. **`src/theme/tokens.ts` is the single source of brand colors**; the Tailwind config must read from it, and components must never hardcode hex values. Inline `style={{}}` only for animated/computed values (Reanimated, SVG coordinates). Remove the Expo template's `constants/Colors.ts` once screens use tokens.
- **i18n:** **No hardcoded user-facing strings.** Every string uses `t('screen.key')` and must exist in **all three** locale files (`en`, `es`, `sw`). Use the active language for `expo-speech` and API calls.
- **State:**
  - **Server data** (path, lessons, transcripts) → **TanStack Query** hooks in `src/api/`. Never copy server data into Zustand.
  - **Client/game state** (coins, streak, hearts, progress, voice-mode toggle) → **Zustand** stores in `src/stores/`, one per domain, persisted with `persist` + AsyncStorage, with `version` + `migrate`.
  - Use selectors (`useGameStore((s) => s.coins)`), not the whole store.
- **API calls:** one typed client in `src/api/` using `fetch` with the base URL from `EXPO_PUBLIC_API_URL`. Components never call `fetch` directly. Use mocks in `src/mocks/` until an endpoint is live.
- **API types live in `src/types/api.ts`** and must match `api/app/schemas/shared.py` exactly (shared contract, §1.3).
- **Animations:** Reanimated worklets for anything per-frame; never animate with `setState`/`setInterval`. Respect the OS "reduce motion" setting.
- **Permissions:** request microphone permission right before recording; handle "denied" with a clear (spoken, in voice mode) message.
- **No secrets in the app.** `EXPO_PUBLIC_*` variables are bundled and readable by anyone. **LLM and Whisper keys exist only in the API.**

### 2.3 API — Python / FastAPI (`api/`)

**Tooling:** Python **3.11**, **Ruff** (`ruff format`, `ruff check`), **pytest**. PEP 8; Google-style docstrings. **Pin versions** in `requirements.txt` (`fastapi==x.y.z`).

**Naming:** `snake_case` functions/variables/modules, `PascalCase` classes and Pydantic models, `UPPER_SNAKE_CASE` constants. Endpoints are versioned and `kebab-case`: `/v1/onboarding`, `/v1/bonus-lessons`, `/v1/voice/transcribe`. JSON fields follow `docs/API_CONTRACTS.md`.

**Rules:**
- **Type hints on every function signature.**
- **Layering:** `routers/` (HTTP only) → `services/` (logic) → storage (`profile_store.py`, SQLite) / `data/`. Routers contain no business logic; services never import FastAPI. Cross-area calls go through the service function (e.g., `profile_store.get_profile(user_id)`), never by reading another area's tables directly.
- **Pydantic is the contract.** Every endpoint declares `response_model`; shared request/response models live in `schemas/shared.py`. Pydantic v2 style (`model_validate`, `model_dump`, `ConfigDict`); use `Field` constraints instead of manual checks.
- **Config:** one `Settings` class (pydantic-settings) reading env vars; no `os.getenv` scattered through the code. Use `Depends` for settings, DB, and external clients so tests can override them.
- **Scoring, template filling, and loan math are pure functions:** no I/O, deterministic, fully unit-tested. Use `Decimal` (not `float`) for money.
- **LLM (`llm/client.py`, `prompts/`):**
  - Code fills in the facts; the LLM rewrites **wording only**.
  - Prompts are versioned files in `prompts/`, not inline strings.
  - Request structured output, then **validate with the Pydantic schema** (`services/validation.py`). On failure or timeout, retry once, then **fall back to the template lesson**. Never return raw LLM output.
  - Set explicit timeouts; log model, latency, and failures (never keys).
- **Voice / STT (`routers/voice.py`):** enforce an audio size limit and allowed MIME types; pass the user's language as a hint. Delete recordings after transcription.
- **Data:** Findex → JSON is a reproducible script in `data/scripts/`, never done by hand. pandas runs **only** in scripts; the API loads the generated JSON once at startup.
- **SQLite:** parameterized queries only; schema created by code, never edited by hand. Lesson cache keys include lesson id, language, country, and prompt version.
- **Errors:** raise `HTTPException` with clear messages; never return 200 with an error payload. **Logging** via `logging`, no `print`.

### 2.4 Accessibility & Voice Mode (non-negotiable)

Kompass must work **by voice alone** for blind and low-vision users. Full rules are in the README; in short:
- Every screen and lesson card (including AI bonus lessons) has voice text / a `voice` block that teaches the same thing as the visual.
- Spoken text: short sentences, reads every option with its letter, says how to answer, never says "tap", "swipe", or "see".
- "repeat", "next", "back", "help" always work; no time limits in voice mode.
- Every interactive element has `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` (translated). Contrast ≥ 4.5:1; tap targets ≥ 44 pt.

### 2.5 General Files

UTF-8, LF line endings, final newline, 2-space indent (TS/JS/JSON/YAML), 4-space indent (Python).

---

## 3. Project Structure

```
/
├── api/
│   ├── app/
│   │   ├── main.py             # FastAPI app
│   │   ├── routers/            # HTTP only: profile, path, lessons, voice
│   │   ├── schemas/shared.py   # Pydantic models (shared contract)
│   │   ├── services/           # scoring, lesson_builder, profile_store, validation, intent, voice_script
│   │   ├── llm/client.py       # the only place that calls the LLM
│   │   └── prompts/            # versioned prompt templates
│   ├── tests/                  # mirrors app/ structure
│   └── requirements.txt
├── app/
│   ├── app/                    # Expo Router routes ONLY (thin)
│   ├── components/             # reusable UI (RoadmapNode, CoinBurst, KikoNeedle…)
│   ├── src/
│   │   ├── api/                # fetch client + TanStack Query hooks
│   │   ├── mocks/              # mock API responses
│   │   ├── stores/             # Zustand stores
│   │   ├── i18n/               # i18next setup + locales/{en,hi,sw,de}.json
│   │   ├── theme/tokens.ts     # brand tokens (single source of truth)
│   │   ├── types/api.ts        # API types (shared contract)
│   │   └── voice/              # voice mode, TTS, recording
│   └── assets/                 # images, fonts, lottie/
├── data/                       # findex/, country_packs/, lesson_templates/, question_bank/, fixtures/, scripts/
├── docs/                       # ARCHITECTURE.md, API_CONTRACTS.md, adr/
├── .github/                    # pull_request_template.md, workflows/
├── CODEOWNERS
├── AGENTS.md                   # this file
└── CLAUDE.md
```

---

## 4. Testing

- **Every feature and bug fix ships with tests.** A bug fix includes a test that fails before the fix.
- Testing pyramid: many **unit** tests, fewer **integration** tests, a few **end-to-end** tests.

**API (pytest, run from `api/`):**
- Unit tests for **scoring, template filling, loan math, intent mapping, and validation**. These are the core of the app; target ≥ 90% coverage.
- Endpoint tests with FastAPI `TestClient`, overriding dependencies (`app.dependency_overrides`).
- **Never call the real LLM or Whisper API in tests.** Mock them, and test the invalid-output → retry → template-fallback path.
- Use `pytest.mark.parametrize` for edge cases (zero/negative amounts, every language and country: US, MX, KE).
- Use `data/fixtures/` for shared test data.

**App (Jest + React Native Testing Library):**
- Unit-test Zustand stores (coin/heart/streak rules, persistence migration) and utilities.
- Component tests query by role/label/text, as a user (or screen reader) would.
- Mock native modules (`expo-speech`, `expo-audio`, AsyncStorage) and the API client.
- A test checks that **every locale file has the same keys** as `en.json`.

**General:** coverage ≥ 80% on logic (a floor, not a goal). Test names describe behavior: `test_score_prioritizes_low_confidence_topics`, `it("loses a heart on a wrong answer")`. Arrange–Act–Assert; tests are independent and deterministic.

---

## 5. CI/CD & Quality Gates

GitHub Actions runs one workflow per package on every PR to `dev` and `main`. **All checks must pass before merge.**

| Step         | `app/`                                  | `api/`                          |
|--------------|-----------------------------------------|---------------------------------|
| Install      | `npm ci`                                | `pip install -r requirements.txt` |
| Format check | `npx prettier --check .`                | `ruff format --check .`         |
| Lint         | `npx expo lint`                         | `ruff check .`                  |
| Type check   | `npx tsc --noEmit`                      | (type hints required; mypy optional) |
| Tests        | `npx jest --coverage`                   | `pytest`                        |
| Health       | `npx expo-doctor`                       | `GET /health` returns ok        |

Local enforcement (recommended): **Husky + lint-staged** for formatting/linting staged files and **commitlint** (`@commitlint/config-conventional`) on commit messages.

---

## 6. Choosing Technology

- The stack in §0 is the default. **Do not add a library that duplicates one already in §0.** In `app/`, prefer Expo modules and always install with `npx expo install <pkg>`. Remember Expo Go only includes bundled native modules (see `app/AGENTS.md`).
- Before adding any dependency: check it's actively maintained, compatible (Expo SDK / Python 3.11), permissively licensed (MIT/Apache-2.0/BSD), and has no known vulnerabilities.
- **Record every significant technical decision as an ADR** in `docs/adr/NNNN-title.md` (e.g., `0001-expo-react-native.md`, `0002-fastapi-pydantic-contracts.md`, `0003-zustand-and-tanstack-query.md`, `0004-server-side-whisper.md`, `0005-llm-wording-only-with-template-fallback.md`, `0006-sqlite-storage-and-cache.md`).
  ```markdown
  # NNNN. <Decision title>
  Date: YYYY-MM-DD
  Status: Proposed | Accepted | Superseded by NNNN
  ## Context        — the problem and constraints
  ## Options        — alternatives considered, with pros/cons
  ## Decision       — what we chose
  ## Consequences   — trade-offs, risks, follow-ups
  ```
- Commit lockfiles (`app/package-lock.json`) and pin Python versions.

---

## 7. Security & Privacy

- No secrets in code, commits, logs, or screenshots. If one is committed, **rotate it immediately**; deleting it in a later commit does not remove it from history.
- **LLM and Whisper API keys live only in the API's `.env`.** The app never calls third-party AI APIs directly.
- Validate all input with Pydantic; limit audio upload size and type; rate-limit AI endpoints.
- Configure CORS explicitly; no `allow_origins=["*"]` outside local development.
- Use only public/synthetic data (Findex is public), never real customer or financial data.

---

## 8. Documentation

- Keep `README.md`, `docs/ARCHITECTURE.md`, and `docs/API_CONTRACTS.md` current. **Update docs in the same PR** as the code that changes them.
- FastAPI's `/docs` is the live API reference: give every endpoint a `summary` and every schema field a `description`.

---

## 9. Definition of Done

A task is done only when **all** are true:
- [ ] Code follows this file; format, lint, and type checks pass
- [ ] Tests written and passing; coverage not decreased
- [ ] UI strings in all 3 locales; works by voice alone; works on a real device via Expo Go
- [ ] PR template fully filled in (incl. accessibility checklist); reviewed and approved; CI green
- [ ] Shared contract files in sync (if touched); docs/ADR updated where relevant
- [ ] Merged into `dev` with a Conventional Commit title

---

## 10. Rules for AI Agents

1. **Read this file (and `app/AGENTS.md` when in `app/`) before making changes.** Match existing patterns before introducing new ones.
2. **Work on a branch** (§1.1), never on `main` or `dev`. PRs target `dev`.
3. **Every commit message follows §1.2**, using a scope from the scope table. Small, atomic commits.
4. Run the relevant checks from §5 for the package you touched before committing. Do not commit failing code.
5. **Use only the §0 stack.** Install app packages with `npx expo install`, API packages by adding a pinned line to `requirements.txt`. Any new dependency needs a stated justification (and an ADR if significant).
6. Do not disable lint rules, add `# type: ignore`/`@ts-ignore`, skip tests, or use `--no-verify` to get around a failing check. Fix the underlying problem.
7. Write tests with every change (§4). Never call real LLM/Whisper APIs in tests.
8. Never hardcode user-facing strings or colors: use i18n keys (all 3 locales) and `tokens.ts`.
9. Every new screen or lesson must meet §2.4 (voice mode + accessibility).
10. Never put secrets in files or in `EXPO_PUBLIC_*` variables; update `.env.example` when adding config.
11. **Shared contract changes** touch `shared.py`, `api.ts`, and `API_CONTRACTS.md` together, and need both @faraz999shah and @willapat to approve. Mark the commit breaking if the shape changed.
12. Stay inside your area (see `CODEOWNERS`); don't refactor unrelated code in the same PR.
13. When writing a PR description, fill in `.github/pull_request_template.md` completely.
