"""CV processing pipeline: extract -> parse -> skills -> store -> score. Runs as a background task for batches."""
from app.core.config import settings
from app.database.connection import SessionLocal
from app.models import CV, CVBatch, CVExtraction, Job
from app.services.cv_extractor import ProcessingError, extract_text, parse_cv
from app.services.matching_engine import compute_and_store
from app.services.notification_service import notify
from app.services.skill_extractor import extract_skills
from app.utils.files import safe_path


def process_cv(db, cv: CV, job: Job | None):
    path = safe_path(settings.CV_DIR, cv.stored_name)
    text = extract_text(path)
    if len(text.strip()) < 30:
        raise ProcessingError("No extractable text found. The file may be a scanned image (OCR is not part of v1).")
    parsed = parse_cv(text, cv.filename)
    ext = db.query(CVExtraction).filter_by(cv_id=cv.id).first() or CVExtraction(cv_id=cv.id)
    ext.text, ext.skills = text, extract_skills(text)
    ext.years_experience, ext.education_level, ext.email = parsed["years"], parsed["education_level"], parsed["email"]
    db.add(ext)
    db.flush()
    if not cv.candidate_user_id:
        cv.candidate_name = parsed["name"]
    if job:
        compute_and_store(db, job, cv, ext)
    return ext


def run_batch(batch_id: int, only_ids: list[int] | None = None):
    db = SessionLocal()
    try:
        batch = db.get(CVBatch, batch_id)
        job = db.get(Job, batch.job_id)
        q = db.query(CV).filter(CV.batch_id == batch_id, CV.status == "pending")
        if only_ids:
            q = q.filter(CV.id.in_(only_ids))
        for cv in q.order_by(CV.id).all():
            cv.status = "processing"
            db.commit()
            try:
                process_cv(db, cv, job)
                cv.status, cv.error = "completed", None
            except Exception as e:
                db.rollback()
                cv = db.get(CV, cv.id)
                cv.status, cv.error, cv.retryable = "failed", str(e)[:300], True
            db.commit()
        files = db.query(CV).filter(CV.batch_id == batch_id).all()
        failed = sum(1 for f in files if f.status == "failed")
        done = sum(1 for f in files if f.status == "completed")
        if failed:
            notify(db, batch.recruiter_id, "CV processing failed", f"{failed} file(s) in batch #{batch_id} failed. You can retry them.",
                   "cv_failed", f"/recruiter/upload?batch={batch_id}")
        notify(db, batch.recruiter_id, "CV batch completed", f"Batch #{batch_id} for '{job.title}': {done} processed, {failed} failed.",
               "batch_completed", f"/recruiter/rankings/{job.id}")
        db.commit()
    finally:
        db.close()


def rescore_job(db, job: Job):
    """Re-run matching for every stored extraction linked to this job (after requirements change)."""
    from app.models import Application
    ids = {i for (i,) in db.query(CV.id).filter(CV.job_id == job.id)}
    ids |= {i for (i,) in db.query(Application.cv_id).filter(Application.job_id == job.id)}
    n = 0
    for cv in db.query(CV).filter(CV.id.in_(ids)).all():
        ext = db.query(CVExtraction).filter_by(cv_id=cv.id).first()
        if ext and cv.status != "duplicate":
            compute_and_store(db, job, cv, ext)
            n += 1
    return n
