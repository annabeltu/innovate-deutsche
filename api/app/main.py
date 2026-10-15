from fastapi import FastAPI

from app.routers import lessons, path, profile, voice

app = FastAPI(title="Kompass API", version="0.1.0")

app.include_router(profile.router)
app.include_router(path.router)
app.include_router(lessons.router)
app.include_router(voice.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
