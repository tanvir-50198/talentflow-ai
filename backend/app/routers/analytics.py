from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.permissions import candidate_only, get_company, recruiter_only
from app.database.connection import get_db
from app.models import CV, Application, ApplicationHistory, CVBatch, CVExtraction, Job, User
from app.utils.serializers import iso, job_out

router = APIRouter(prefix="/analytics", tags=["analytics"])
PROFILE_FIELDS = ["phone", "headline", "location", "summary", "skills", "education", "experience", "linkedin"]


@router.get("/candidate")
def candidate(user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    p = user.candidate_profile
    filled = sum(1 for f in PROFILE_FIELDS if getattr(p, f, None)) + (1 if user.avatar_path else 0) \
        + (1 if db.query(CV).filter_by(candidate_user_id=user.id).first() else 0)
    completion = round(100 * filled / (len(PROFILE_FIELDS) + 2))
    apps = db.query(Application).filter_by(candidate_id=user.id).all()
    count = lambda *s: sum(1 for a in apps if a.status in s)
    ids = [a.id for a in apps]
    recent = []
    if ids:
        for h in db.query(ApplicationHistory).filter(ApplicationHistory.application_id.in_(ids)).order_by(ApplicationHistory.id.desc()).limit(6):
            a = next(x for x in apps if x.id == h.application_id)
            recent.append({"job_title": db.get(Job, a.job_id).title, "status": h.new_status, "at": iso(h.created_at)})
    # Recommended jobs: overlap between the profile / default-CV skills and the job's skills
    mine = {s.lower() for s in (p.skills or [])}
    cv = db.query(CV).filter_by(candidate_user_id=user.id, status="completed").order_by(CV.is_default.desc(), CV.id.desc()).first()
    if cv:
        ext = db.query(CVExtraction).filter_by(cv_id=cv.id).first()
        mine |= {s["skill"].lower() for s in (ext.skills if ext else [])}
    applied = {a.job_id for a in apps}
    recs = []
    for j in db.query(Job).filter(Job.status == "published", or_(Job.deadline.is_(None), Job.deadline >= date.today())).all():
        if j.id in applied:
            continue
        names = {s.skill.lower() for s in j.skills}
        overlap = len(mine & names)
        if overlap:
            recs.append((overlap / max(len(names), 1), j))
    recs.sort(key=lambda x: -x[0])
    return {"profile_completion": completion, "total": len(apps), "pending": count("applied", "under_review"),
            "shortlisted": count("shortlisted"), "interview": count("interview"), "under_review": count("under_review"),
            "recent": recent, "recommended": [job_out(j, detail=False) for _, j in recs[:5]]}


@router.get("/recruiter")
def recruiter(user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = get_company(db, user)
    empty = {"has_company": False}
    if not c:
        return empty
    jobs = db.query(Job).filter_by(company_id=c.id).all()
    jids = [j.id for j in jobs] or [0]
    cvs = db.query(CV).filter(CV.job_id.in_(jids), CV.batch_id.isnot(None)).all()
    apps = db.query(Application).filter(Application.job_id.in_(jids)).all()
    dist = {}
    for a in apps:
        dist[a.status] = dist.get(a.status, 0) + 1
    cv_status = {}
    for x in cvs:
        cv_status[x.status] = cv_status.get(x.status, 0) + 1
    recent = []
    ids = [a.id for a in apps]
    if ids:
        for h in db.query(ApplicationHistory).filter(ApplicationHistory.application_id.in_(ids)).order_by(ApplicationHistory.id.desc()).limit(8):
            a = next(x for x in apps if x.id == h.application_id)
            recent.append({"text": f"{db.get(User, a.candidate_id).full_name} moved to {h.new_status.replace('_', ' ')} for {db.get(Job, a.job_id).title}", "at": iso(h.created_at)})
    for b in db.query(CVBatch).filter(CVBatch.job_id.in_(jids)).order_by(CVBatch.id.desc()).limit(4):
        n = sum(1 for x in cvs if x.batch_id == b.id)
        recent.append({"text": f"CV batch #{b.id}: {n} file(s) uploaded for {db.get(Job, b.job_id).title}", "at": iso(b.created_at)})
    recent.sort(key=lambda r: r["at"] or "", reverse=True)
    per_job = [{"title": j.title[:24], "applications": sum(1 for a in apps if a.job_id == j.id),
                "cvs": sum(1 for x in cvs if x.job_id == j.id)} for j in jobs]
    return {"has_company": True, "total_jobs": len(jobs), "active_jobs": sum(1 for j in jobs if j.status == "published"),
            "total_cvs": len(cvs), "processed_cvs": cv_status.get("completed", 0), "failed_cvs": cv_status.get("failed", 0),
            "duplicate_cvs": cv_status.get("duplicate", 0), "applications": len(apps),
            "awaiting_review": sum(1 for a in apps if a.status == "applied"), "shortlisted": dist.get("shortlisted", 0),
            "status_distribution": [{"status": k, "count": v} for k, v in dist.items()],
            "cv_status": [{"status": k, "count": v} for k, v in cv_status.items()], "per_job": per_job, "recent": recent[:8]}
