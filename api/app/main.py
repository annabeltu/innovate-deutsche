from fastapi import FastAPI

from app.error_handlers import register_error_handlers
from app.routers import lessons, path, profile, voice

app = FastAPI(title="Kompass API", version="0.1.0")
register_error_handlers(app)

app.include_router(profile.router)
app.include_router(path.router)
app.include_router(lessons.router)
app.include_router(voice.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
