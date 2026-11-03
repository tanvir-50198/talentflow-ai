from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.connection import init_db
from app.routers import analytics, applications, auth, batches, companies, cvs, jobs, matching, notifications, profiles


@asynccontextmanager
async def lifespan(_):
    init_db()
    yield


app = FastAPI(title="TalentFlow AI API", version="1.0.0", lifespan=lifespan,
              description="Explainable recruitment decision-support platform. Scores assist recruiters; they never make hiring decisions.")
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (auth, profiles, companies, jobs, cvs, batches, matching, applications, notifications, analytics):
    app.include_router(r.router, prefix="/api/v1")


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
