import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


def _load_dotenv():
    f = BASE_DIR / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_dotenv()


class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-please-use-32+chars")
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'talentflow.db'}")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
    ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
    REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
    MAX_BATCH_FILES = int(os.getenv("MAX_BATCH_FILES", "50"))
    MAX_CV_BYTES = int(os.getenv("MAX_CV_MB", "5")) * 1024 * 1024
    MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_MB", "2")) * 1024 * 1024
    DEBUG = os.getenv("DEBUG", "0") == "1"
    STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))

    @property
    def CV_DIR(self): return self.STORAGE_DIR / "cvs"
    @property
    def AVATAR_DIR(self): return self.STORAGE_DIR / "avatars"
    @property
    def LOGO_DIR(self): return self.STORAGE_DIR / "logos"


settings = Settings()
for _d in (settings.CV_DIR, settings.AVATAR_DIR, settings.LOGO_DIR):
    _d.mkdir(parents=True, exist_ok=True)
