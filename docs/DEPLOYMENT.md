# Deploying the API and connecting the app

Owner: voice & integration. Nothing here has been deployed yet; deploying needs team sign-off.

## Environment variables (API)

Read by `api/app/config.py` from the process environment, or from `api/.env` when the API runs from `api/`. Never commit `.env`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_PATH` | no | `kompass.db` | SQLite file for profiles and quizzes |
| `CORS_ALLOW_ORIGINS` | only for Expo web | `[]` | JSON list, e.g. `["https://kompass-web.example"]`. Native apps send no Origin and need none. Never `["*"]` outside local development. |
| `WHISPER_API_KEY` | for speech-to-text | unset → `/transcribe` returns 503 | Speech-to-text key (server-side only) |
| `WHISPER_API_URL` | no | OpenAI `/v1/audio/transcriptions` | Any OpenAI-compatible transcription endpoint |
| `WHISPER_MODEL` | no | `whisper-1` | |
| `TTS_API_KEY` | no | unset → app uses on-device speech | Hosted text-to-speech key |
| `TTS_API_URL` / `TTS_MODEL` / `TTS_VOICE` | no | OpenAI `/v1/audio/speech`, `tts-1`, `alloy` | |
| `TTS_LANGUAGES` | no | `["en","es","sw"]` | Languages served by hosted TTS. Others fall back to the device. |
| `VOICE_PROVIDER_TIMEOUT_SECONDS` | no | `20` | Per-call timeout for STT/TTS |
| `VOICE_MAX_AUDIO_BYTES` | no | `10485760` | Upload limit for recordings |
| `VOICE_DEV_FIXTURES` | **local only** | `false` | Labeled fixture transcript when no Whisper key. Never set in a deployed environment. |
| `LLM_API_KEY` | Faraz's lesson layer | | |

## Run locally

```bash
cd api
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env        # then fill in keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health: `curl http://localhost:8000/health` returns `{"status":"ok"}`. Docs: <http://localhost:8000/docs>.

## Connecting the Expo app

The app reads the base URL from `EXPO_PUBLIC_API_URL` in `app/.env`, for example `EXPO_PUBLIC_API_URL=http://192.168.1.23:8000`. `EXPO_PUBLIC_*` values are bundled into the app and readable by anyone, so **never put keys there**. Restart `npx expo start` after changing it.

**Physical phone via Expo Go:** `localhost` on the phone means the phone itself, not your laptop.

- Run the API with `--host 0.0.0.0`, put the phone on the same Wi-Fi, and use your laptop's LAN IP (`ipconfig getifaddr en0` on macOS). Campus and guest Wi-Fi often block device-to-device traffic. If so, use a phone hotspot or the deployed URL.
- `npx expo start --tunnel` tunnels only the JavaScript bundle, not the API.
- The iOS simulator can use `http://localhost:8000`; the Android emulator uses `http://10.0.2.2:8000`.
- For the demo, prefer the deployed HTTPS URL. It works on any network, and store builds require HTTPS.

## Deploying (proposal: one small web service)

Any host that runs a Python web process works. Render, Railway or Fly.io are each a single service with no extra infrastructure. Settings for Render as an example:

| Setting | Value |
|---|---|
| Root directory | `api` |
| Runtime | Python 3.11 (`PYTHON_VERSION=3.11.x`) |
| Build | `pip install -r requirements.txt` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |
| Env vars | as above, entered in the host's secret settings |

Caveats:

- **SQLite on most free tiers lives on an ephemeral disk.** Profiles reset on every deploy or restart. That's fine for a demo; for anything longer, attach a persistent disk and set `DATABASE_PATH` to it.
- Set a request body limit at the host or proxy (about 12 MB). The API also enforces `VOICE_MAX_AUDIO_BYTES`.
- The AI endpoints have no rate limit yet (AGENTS.md §7). Add one before sharing the URL widely.
- If a key ever lands in a commit, rotate it immediately.
