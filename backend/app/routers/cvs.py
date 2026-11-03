from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import can_access_cv, candidate_only, get_current_user
from app.database.connection import get_db
from app.models import CV, Application, CVExtraction, User
from app.services.processor import process_cv
from app.utils.files import CV_SIGS, FileError, safe_path, sha256, store, validate
from app.utils.serializers import iso

router = APIRouter(prefix="/cvs", tags=["cvs"])


def cv_out(cv: CV):
    return {"id": cv.id, "filename": cv.filename, "status": cv.status, "error": cv.error, "is_default": cv.is_default,
            "size": cv.size, "created_at": iso(cv.created_at), "candidate_name": cv.candidate_name,
            "duplicate_of_id": cv.duplicate_of_id, "retryable": cv.retryable}


def _own(db, user, cv_id) -> CV:
    cv = db.get(CV, cv_id)
    if not cv or cv.candidate_user_id != user.id:
        raise HTTPException(404, "CV not found")
    return cv


def _run(db, cv):
    cv.status = "processing"
    try:
        process_cv(db, cv, None)
        cv.status, cv.error = "completed", None
    except Exception as e:
        db.rollback()
        cv.status, cv.error = "failed", str(e)[:300]


@router.post("/upload", status_code=201)
async def upload_cv(file: UploadFile = File(...), user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    content = await file.read(settings.MAX_CV_BYTES + 1)
    try:
        ext = validate(file.filename, content, CV_SIGS, settings.MAX_CV_BYTES)
    except FileError as e:
        raise HTTPException(400, str(e))
    h = sha256(content)
    if db.query(CV).filter_by(candidate_user_id=user.id, file_hash=h).first():
        raise HTTPException(409, "You already uploaded this exact file")
    first = db.query(CV).filter_by(candidate_user_id=user.id).count() == 0
    cv = CV(uploaded_by=user.id, candidate_user_id=user.id, candidate_name=user.full_name, filename=file.filename[:200],
            stored_name=store(settings.CV_DIR, content, ext), file_hash=h, size=len(content), is_default=first)
    db.add(cv)
    db.flush()
    _run(db, cv)
    db.add(cv)
    db.commit()
    return cv_out(cv)


@router.get("")
def my_cvs(user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    return {"items": [cv_out(c) for c in db.query(CV).filter_by(candidate_user_id=user.id).order_by(CV.created_at.desc())]}


@router.get("/{cv_id}")
def get_cv(cv_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cv = db.get(CV, cv_id)
    if not cv or not can_access_cv(db, user, cv):
        raise HTTPException(404, "CV not found")
    return cv_out(cv)


@router.get("/{cv_id}/download")
def download_cv(cv_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cv = db.get(CV, cv_id)
    if not cv or not can_access_cv(db, user, cv):
        raise HTTPException(404, "CV not found")
    media = "application/pdf" if cv.filename.lower().endswith(".pdf") else \
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(safe_path(settings.CV_DIR, cv.stored_name), media_type=media, filename=cv.filename,
                        content_disposition_type="inline" if media == "application/pdf" else "attachment")


@router.patch("/{cv_id}/default")
def set_default(cv_id: int, user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    cv = _own(db, user, cv_id)
    db.query(CV).filter_by(candidate_user_id=user.id).update({"is_default": False})
    cv.is_default = True
    db.commit()
    return cv_out(cv)


@router.put("/{cv_id}/replace")
async def replace_cv(cv_id: int, file: UploadFile = File(...), user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    cv = _own(db, user, cv_id)
    if db.query(Application).filter_by(cv_id=cv.id).first():
        raise HTTPException(409, "This CV is attached to an application. Upload a new CV instead.")
    content = await file.read(settings.MAX_CV_BYTES + 1)
    try:
        ext = validate(file.filename, content, CV_SIGS, settings.MAX_CV_BYTES)
    except FileError as e:
        raise HTTPException(400, str(e))
    old = cv.stored_name
    cv.stored_name, cv.filename, cv.size, cv.file_hash = store(settings.CV_DIR, content, ext), file.filename[:200], len(content), sha256(content)
    _run(db, cv)
    db.add(cv)
    db.commit()
    if old:
        (settings.CV_DIR / old).unlink(missing_ok=True)
    return cv_out(cv)


@router.delete("/{cv_id}", status_code=204)
def delete_cv(cv_id: int, user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    cv = _own(db, user, cv_id)
    if db.query(Application).filter_by(cv_id=cv.id).first():
        raise HTTPException(409, "This CV is attached to an application and cannot be deleted.")
    if cv.stored_name:
        (settings.CV_DIR / cv.stored_name).unlink(missing_ok=True)
    was_default = cv.is_default
    db.query(CVExtraction).filter_by(cv_id=cv.id).delete()
    db.delete(cv)
    db.flush()
    if was_default:
        nxt = db.query(CV).filter_by(candidate_user_id=user.id).order_by(CV.created_at.desc()).first()
        if nxt:
            nxt.is_default = True
    db.commit()
