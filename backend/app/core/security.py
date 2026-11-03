import uuid
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_ph = PasswordHash.recommended()
ALGO = "HS256"


def hash_password(p: str) -> str:
    return _ph.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return _ph.verify(p, h)
    except Exception:
        return False


def create_token(sub, kind: str, minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(sub), "type": kind, "iat": now, "exp": now + timedelta(minutes=minutes), "jti": uuid.uuid4().hex}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGO)


def decode_token(token: str, kind: str) -> dict:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO])
    if payload.get("type") != kind:
        raise jwt.InvalidTokenError("wrong token type")
    return payload
