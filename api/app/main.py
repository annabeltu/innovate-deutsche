from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.error_handlers import register_error_handlers
from app.routers import lessons, path, profile, voice

app = FastAPI(title="Kompass API", version="0.1.0")
register_error_handlers(app)

# Native apps do not send an Origin header; this only matters for Expo web.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_allow_origins,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)

app.include_router(profile.router)
app.include_router(path.router)
app.include_router(lessons.router)
app.include_router(voice.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
