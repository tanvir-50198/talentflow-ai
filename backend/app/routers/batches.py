from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import get_job_for_recruiter, recruiter_only, require_company
from app.database.connection import get_db
from app.models import CV, CVBatch, Job, MatchResult, User
from app.routers.cvs import cv_out
from app.services.duplicate_detector import find_duplicate
from app.services.processor import run_batch
from app.utils.files import CV_SIGS, FileError, sha256, store, validate
from app.utils.serializers import iso

router = APIRouter(prefix="/batches", tags=["batches"])


def batch_out(db, b: CVBatch):
    files = db.query(CV).filter_by(batch_id=b.id).all()
    counts = {s: 0 for s in ("pending", "processing", "completed", "failed", "duplicate")}
    for f in files:
        counts[f.status] = counts.get(f.status, 0) + 1
    active = counts["pending"] + counts["processing"]
    status = "processing" if active else ("failed" if files and counts["completed"] == 0 and counts["failed"] else "completed")
    job = db.get(Job, b.job_id)
    return {"id": b.id, "job_id": b.job_id, "job_title": job.title if job else None, "created_at": iso(b.created_at),
            "total": len(files), "counts": counts, "finished": len(files) - active, "status": status}


def _get(db, user, batch_id) -> CVBatch:
    b = db.get(CVBatch, batch_id)
    if not b:
        raise HTTPException(404, "Batch not found")
    get_job_for_recruiter(db, user, b.job_id)
    return b


@router.post("", status_code=201)
async def create_batch(bg: BackgroundTasks, job_id: int = Form(...), files: list[UploadFile] = File(...),
                       user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    job = get_job_for_recruiter(db, user, job_id)
    if not files:
        raise HTTPException(400, "Select at least one CV")
    if len(files) > settings.MAX_BATCH_FILES:
        raise HTTPException(400, f"You can upload up to {settings.MAX_BATCH_FILES} CVs per batch")
    batch = CVBatch(recruiter_id=user.id, job_id=job.id)
    db.add(batch)
    db.flush()
    for f in files:
        content = await f.read(settings.MAX_CV_BYTES + 1)
        name = (f.filename or "cv")[:200]
        cv = CV(uploaded_by=user.id, batch_id=batch.id, job_id=job.id, filename=name, size=len(content))
        try:
            ext = validate(name, content, CV_SIGS, settings.MAX_CV_BYTES)
        except FileError as e:  # invalid files are recorded individually, not rejected as a whole
            cv.status, cv.error, cv.retryable = "failed", str(e), False
            db.add(cv)
            continue
        cv.file_hash = sha256(content)
        cv.stored_name = store(settings.CV_DIR, content, ext)
        dup = find_duplicate(db, cv.file_hash, job.id, user.id)
        if dup:
            cv.status, cv.duplicate_of_id = "duplicate", dup.id
            cv.error = f"Same file as '{dup.filename}' (CV #{dup.id}). Inspect before taking action."
        db.add(cv)
        db.flush()
    db.commit()
    bg.add_task(run_batch, batch.id)
    return batch_out(db, batch)


@router.get("")
def list_batches(user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = require_company(db, user)
    ids = [i for (i,) in db.query(Job.id).filter_by(company_id=c.id)]
    bs = db.query(CVBatch).filter(CVBatch.job_id.in_(ids)).order_by(CVBatch.created_at.desc()).limit(20).all() if ids else []
    return {"items": [batch_out(db, b) for b in bs]}


@router.get("/{batch_id}")
def get_batch(batch_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    return batch_out(db, _get(db, user, batch_id))


@router.get("/{batch_id}/files")
def batch_files(batch_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    b = _get(db, user, batch_id)
    out = []
    for cv in db.query(CV).filter_by(batch_id=b.id).order_by(CV.id).all():
        d = cv_out(cv)
        m = db.query(MatchResult).filter_by(job_id=b.job_id, cv_id=cv.id).first()
        d["match_id"], d["score"] = (m.id, m.total) if m else (None, None)
        out.append(d)
    return {"items": out}


@router.post("/{batch_id}/retry")
def retry(batch_id: int, bg: BackgroundTasks, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    b = _get(db, user, batch_id)
    failed = db.query(CV).filter_by(batch_id=b.id, status="failed", retryable=True).all()
    if not failed:
        raise HTTPException(400, "No failed files can be retried")
    for cv in failed:
        cv.status, cv.error = "pending", None
    db.commit()
    bg.add_task(run_batch, b.id)
    return {"retrying": len(failed)}
