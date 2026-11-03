from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import get_current_user
from app.core.security import hash_password, verify_password
from app.database.connection import get_db
from app.models import User
from app.utils.files import IMG_SIGS, FileError, safe_path, store, validate
from app.utils.serializers import avatar_url, user_brief

router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileIn(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    phone: str | None = None
    headline: str | None = None
    location: str | None = None
    summary: str | None = None
    skills: list[str] | None = None
    education: str | None = None
    experience: str | None = None
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None
    job_title: str | None = None


class PasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


CANDIDATE_FIELDS = ["phone", "headline", "location", "summary", "skills", "education", "experience", "linkedin", "github", "portfolio"]
RECRUITER_FIELDS = ["phone", "job_title"]


def profile_out(user: User):
    d = user_brief(user)
    p = user.candidate_profile if user.role == "candidate" else user.recruiter_profile
    for f in (CANDIDATE_FIELDS if user.role == "candidate" else RECRUITER_FIELDS):
        d[f] = getattr(p, f, None) if p else None
    if user.role == "candidate":
        d["skills"] = d["skills"] or []
    return d


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return profile_out(user)


@router.put("/me")
def update_me(data: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vals = data.model_dump(exclude_unset=True)
    if "full_name" in vals and vals["full_name"]:
        user.full_name = vals["full_name"].strip()
    p = user.candidate_profile if user.role == "candidate" else user.recruiter_profile
    for f in (CANDIDATE_FIELDS if user.role == "candidate" else RECRUITER_FIELDS):
        if f in vals:
            setattr(p, f, vals[f])
    db.commit()
    return profile_out(user)


@router.post("/me/password")
def change_password(data: PasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    content = await file.read(settings.MAX_IMAGE_BYTES + 1)
    try:
        ext = validate(file.filename, content, IMG_SIGS, settings.MAX_IMAGE_BYTES)
    except FileError as e:
        raise HTTPException(400, str(e))
    old = user.avatar_path
    user.avatar_path = store(settings.AVATAR_DIR, content, ext)
    db.commit()
    if old:
        (settings.AVATAR_DIR / old).unlink(missing_ok=True)
    return {"avatar_url": avatar_url(user)}


@router.delete("/me/avatar")
def delete_avatar(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.avatar_path:
        (settings.AVATAR_DIR / user.avatar_path).unlink(missing_ok=True)
        user.avatar_path = None
        db.commit()
    return {"avatar_url": None}


@router.get("/{user_id}/avatar")
def get_avatar(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u or not u.avatar_path:
        raise HTTPException(404, "No avatar")
    return FileResponse(safe_path(settings.AVATAR_DIR, u.avatar_path), headers={"Cache-Control": "private, max-age=3600"})
