import hashlib
import uuid
from pathlib import Path

from fastapi import HTTPException


class FileError(Exception):
    pass


CV_SIGS = {".pdf": (b"%PDF",), ".docx": (b"PK\x03\x04",)}
IMG_SIGS = {".jpg": (b"\xff\xd8\xff",), ".jpeg": (b"\xff\xd8\xff",), ".png": (b"\x89PNG\r\n\x1a\n",), ".webp": (b"RIFF",)}


def validate(name: str, content: bytes, sigs: dict, max_bytes: int) -> str:
    ext = Path(name or "").suffix.lower()
    if ext not in sigs:
        raise FileError(f"Unsupported file type '{ext or 'unknown'}'. Allowed: {', '.join(sigs)}")
    if not content:
        raise FileError("The file is empty.")
    if len(content) > max_bytes:
        raise FileError(f"The file is larger than the {max_bytes // (1024 * 1024)} MB limit.")
    if not any(content.startswith(s) for s in sigs[ext]):
        raise FileError("The file content does not match its extension.")
    return ext


def store(directory: Path, content: bytes, ext: str) -> str:
    name = f"{uuid.uuid4().hex}{ext}"  # server-generated filename, never user supplied
    (directory / name).write_bytes(content)
    return name


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def safe_path(directory: Path, stored_name: str) -> Path:
    p = (directory / (stored_name or "")).resolve()
    if directory.resolve() not in p.parents or not p.is_file():
        raise HTTPException(404, "File not found")
    return p
