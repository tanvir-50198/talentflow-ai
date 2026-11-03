from typing import Literal

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.database.connection import get_db
from app.models import CandidateProfile, RecruiterProfile, User
from app.utils.serializers import user_brief

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    role: Literal["candidate", "recruiter"]


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


def _tokens(user):
    return {"access_token": create_token(user.id, "access", settings.ACCESS_TOKEN_MINUTES),
            "refresh_token": create_token(user.id, "refresh", settings.REFRESH_TOKEN_DAYS * 1440),
            "token_type": "bearer", "user": user_brief(user)}


@router.post("/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, "An account with this email already exists")
    user = User(email=email, password_hash=hash_password(data.password), role=data.role, full_name=data.full_name.strip())
    user.candidate_profile = CandidateProfile(skills=[]) if data.role == "candidate" else None
    user.recruiter_profile = RecruiterProfile() if data.role == "recruiter" else None
    db.add(user)
    db.commit()
    return _tokens(user)


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email.lower()).first()
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    return _tokens(user)


@router.post("/refresh")
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token, "refresh")
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expired. Please log in again")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(401, "Session expired. Please log in again")
    return _tokens(user)


@router.post("/logout")
def logout():
    # Stateless JWT: the client discards its tokens. A server-side denylist can be added later.
    return {"ok": True}


@router.post("/forgot-password")
def forgot(data: ForgotIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email.lower()).first()
    out = {"message": "If an account exists for that email, a reset link has been sent."}
    if user and settings.DEBUG:  # no email service in v1: dev mode returns the token directly
        out["dev_reset_token"] = create_token(user.id, "reset", 30)
    return out


@router.post("/reset-password")
def reset(data: ResetIn, db: Session = Depends(get_db)):
    try:
        payload = decode_token(data.token, "reset")
    except jwt.PyJWTError:
        raise HTTPException(400, "This reset link is invalid or has expired")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(400, "This reset link is invalid or has expired")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated. You can log in now."}
