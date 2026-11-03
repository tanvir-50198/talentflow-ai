from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import candidate_only, get_company, get_current_user, recruiter_only, require_company
from app.database.base import utcnow
from app.database.connection import get_db
from app.models import CV, Application, ApplicationHistory, CompanyMember, CVExtraction, Job, MatchResult, User
from app.services.matching_engine import compute_and_store
from app.services.notification_service import notify
from app.utils.serializers import avatar_url, iso, logo_url

router = APIRouter(tags=["applications"])
STATUSES = ["applied", "under_review", "shortlisted", "interview", "offered", "rejected", "withdrawn"]
WITHDRAWABLE = {"applied", "under_review", "shortlisted", "interview"}


class ApplyIn(BaseModel):
    cv_id: int


class StatusIn(BaseModel):
    status: Literal["applied", "under_review", "shortlisted", "interview", "offered", "rejected"]
    reason: str | None = None  # private, recruiters only
    message: str | None = Field(default=None, max_length=2000)  # shown to the candidate


class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class InterviewIn(BaseModel):
    scheduled_at: datetime
    mode: Literal["online", "onsite"]
    meeting_link: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=300)
    note: str | None = Field(default=None, max_length=2000)


class WithdrawIn(BaseModel):
    reason: str | None = None


def _history(db, app, show_reason: bool):
    rows = db.query(ApplicationHistory).filter_by(application_id=app.id).order_by(ApplicationHistory.id).all()
    out = []
    for h in rows:
        u = db.get(User, h.changed_by)
        out.append({"previous_status": h.previous_status, "new_status": h.new_status, "changed_by": u.full_name if u else None,
                    "reason": h.reason if show_reason else None, "message": h.message, "created_at": iso(h.created_at)})
    return out


def interview_out(a: Application):
    if not a.interview_at:
        return None
    return {"scheduled_at": iso(a.interview_at), "mode": a.interview_mode, "meeting_link": a.interview_link,
            "location": a.interview_location, "note": a.interview_note}


def _last_message(db, a: Application):
    h = (db.query(ApplicationHistory).filter(ApplicationHistory.application_id == a.id, ApplicationHistory.message.isnot(None))
         .order_by(ApplicationHistory.id.desc()).first())
    if not h:
        return None
    u = db.get(User, h.changed_by)
    return {"text": h.message, "by": u.full_name if u else None, "created_at": iso(h.created_at)}


def _own_app(db, user, application_id):
    """Application that belongs to the recruiter's company, or 404."""
    a = db.get(Application, application_id)
    c = require_company(db, user)
    job = db.get(Job, a.job_id) if a else None
    if not a or job.company_id != c.id:
        raise HTTPException(404, "Application not found")
    return a, job


def _fmt_when(dt: datetime) -> str:
    return dt.strftime("%d %b %Y, %H:%M UTC")


def _log(db, app, prev, new, by, reason=None, message=None):
    db.add(ApplicationHistory(application_id=app.id, previous_status=prev, new_status=new, changed_by=by, reason=reason, message=message))


def app_out(db, a: Application, role: str):
    job = db.get(Job, a.job_id)
    cand = db.get(User, a.candidate_id)
    d = {"id": a.id, "status": a.status, "created_at": iso(a.created_at), "updated_at": iso(a.updated_at), "cv_id": a.cv_id,
         "job": {"id": job.id, "title": job.title, "company": job.company.name, "company_logo": logo_url(job.company),
                 "location": job.location},
         "interview": interview_out(a), "last_message": _last_message(db, a)}
    if role == "recruiter":
        m = db.query(MatchResult).filter_by(job_id=a.job_id, cv_id=a.cv_id).first()
        d["candidate"] = {"id": cand.id, "name": cand.full_name, "email": cand.email, "avatar_url": avatar_url(cand)}
        d["match_id"], d["score"] = (m.id, m.total) if m else (None, None)
    return d


@router.post("/jobs/{job_id}/apply", status_code=201)
def apply(job_id: int, data: ApplyIn, user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or job.status != "published" or (job.deadline and job.deadline < date.today()):
        raise HTTPException(400, "This job is not open for applications")
    cv = db.get(CV, data.cv_id)
    if not cv or cv.candidate_user_id != user.id:
        raise HTTPException(404, "CV not found")
    ext = db.query(CVExtraction).filter_by(cv_id=cv.id).first()
    if cv.status != "completed" or not ext:
        raise HTTPException(400, "This CV was not processed successfully. Choose another CV or re-upload it.")
    app = db.query(Application).filter_by(job_id=job.id, candidate_id=user.id).first()
    if app and app.status != "withdrawn":
        raise HTTPException(409, "You already applied to this job")
    if app:
        prev, app.status, app.cv_id = app.status, "applied", cv.id
        _log(db, app, prev, "applied", user.id, "Re-applied")
    else:
        app = Application(job_id=job.id, candidate_id=user.id, cv_id=cv.id, status="applied")
        db.add(app)
        db.flush()
        _log(db, app, None, "applied", user.id)
    compute_and_store(db, job, cv, ext)
    notify(db, user.id, "Application submitted", f"You applied to {job.title} at {job.company.name}.", "application_submitted", "/candidate/applications")
    for (uid,) in db.query(CompanyMember.user_id).filter_by(company_id=job.company_id):
        notify(db, uid, "New application received", f"{user.full_name} applied to {job.title}.", "new_application", "/recruiter/applications")
    db.commit()
    return app_out(db, app, "candidate")


@router.get("/applications/me")
def my_apps(user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    rows = db.query(Application).filter_by(candidate_id=user.id).order_by(Application.created_at.desc()).all()
    return {"items": [app_out(db, a, "candidate") for a in rows]}


@router.get("/applications")
def company_apps(job_id: int | None = None, status: str | None = None, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = require_company(db, user)
    ids = [i for (i,) in db.query(Job.id).filter_by(company_id=c.id)]
    q = db.query(Application).filter(Application.job_id.in_(ids or [0]))
    if job_id:
        q = q.filter(Application.job_id == job_id)
    if status:
        q = q.filter(Application.status == status)
    return {"items": [app_out(db, a, "recruiter") for a in q.order_by(Application.updated_at.desc()).all()]}


@router.get("/applications/{application_id}")
def get_app(application_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.get(Application, application_id)
    if not a:
        raise HTTPException(404, "Application not found")
    if user.role == "candidate":
        if a.candidate_id != user.id:
            raise HTTPException(404, "Application not found")
    else:
        c = get_company(db, user)
        job = db.get(Job, a.job_id)
        if not c or job.company_id != c.id:
            raise HTTPException(404, "Application not found")
    d = app_out(db, a, user.role)
    d["history"] = _history(db, a, show_reason=user.role == "recruiter")
    return d


@router.patch("/applications/{application_id}/withdraw")
def withdraw(application_id: int, data: WithdrawIn | None = None, user: User = Depends(candidate_only), db: Session = Depends(get_db)):
    a = db.get(Application, application_id)
    if not a or a.candidate_id != user.id:
        raise HTTPException(404, "Application not found")
    if a.status not in WITHDRAWABLE:
        raise HTTPException(400, "This application can no longer be withdrawn")
    prev, a.status = a.status, "withdrawn"
    _log(db, a, prev, "withdrawn", user.id, data.reason if data else None)
    db.commit()
    return app_out(db, a, "candidate")


@router.patch("/applications/{application_id}/status")
def set_status(application_id: int, data: StatusIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    a, job = _own_app(db, user, application_id)
    if a.status == "withdrawn":
        raise HTTPException(400, "The candidate withdrew this application")
    msg = (data.message or "").strip() or None
    if a.status != data.status:
        prev, a.status = a.status, data.status
        _log(db, a, prev, data.status, user.id, data.reason, msg)
        title = {"shortlisted": "Application shortlisted", "interview": "Interview status updated"}.get(data.status, "Application status updated")
        text = f"{job.title} at {job.company.name} is now '{data.status.replace('_', ' ')}'."
        if msg:
            text += f" Message from the recruiter: {msg}"
        notify(db, a.candidate_id, title, text, "status_update", "/candidate/applications")
        db.commit()
    elif msg:
        _send_message(db, a, job, user, msg)
        db.commit()
    return app_out(db, a, "recruiter")


def _send_message(db, a, job, user, msg):
    _log(db, a, a.status, a.status, user.id, None, msg)
    notify(db, a.candidate_id, "New message from the recruiter", f"{job.title} at {job.company.name}: {msg}",
           "recruiter_message", "/candidate/applications")


@router.post("/applications/{application_id}/message", status_code=201)
def send_message(application_id: int, data: MessageIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    a, job = _own_app(db, user, application_id)
    if a.status == "withdrawn":
        raise HTTPException(400, "The candidate withdrew this application")
    msg = data.message.strip()
    if not msg:
        raise HTTPException(400, "Write a message first")
    _send_message(db, a, job, user, msg)
    db.commit()
    return app_out(db, a, "recruiter")


@router.put("/applications/{application_id}/interview")
def schedule_interview(application_id: int, data: InterviewIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    a, job = _own_app(db, user, application_id)
    if a.status in ("withdrawn", "rejected"):
        raise HTTPException(400, f"You cannot schedule an interview for a {a.status} application")
    when = data.scheduled_at
    when = when.astimezone(timezone.utc).replace(tzinfo=None) if when.tzinfo else when  # stored as naive UTC
    if when < utcnow():
        raise HTTPException(400, "Choose a date and time in the future")
    link = (data.meeting_link or "").strip() or None
    place = (data.location or "").strip() or None
    note = (data.note or "").strip() or None
    if data.mode == "online":
        if not link or not link.lower().startswith(("https://", "http://")):
            raise HTTPException(400, "Add the meeting link (for example a Google Meet link starting with https://)")
        place = None
    else:
        if not place:
            raise HTTPException(400, "Add the interview location")
        link = None
    rescheduled = a.interview_at is not None
    a.interview_at, a.interview_mode, a.interview_link, a.interview_location, a.interview_note = when, data.mode, link, place, note
    prev = a.status
    a.status = "interview"
    summary = f"Interview {'rescheduled to' if rescheduled else 'scheduled for'} {_fmt_when(when)} ({'online' if data.mode == 'online' else 'on-site'})"
    _log(db, a, prev, "interview", user.id, None, summary + (f". {note}" if note else ""))
    where = f"Join: {link}" if link else f"Location: {place}"
    notify(db, a.candidate_id, "Interview rescheduled" if rescheduled else "Interview scheduled",
           f"{job.title} at {job.company.name} — {_fmt_when(when)}. {where}", "interview", "/candidate/applications")
    db.commit()
    return app_out(db, a, "recruiter")


@router.delete("/applications/{application_id}/interview")
def cancel_interview(application_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    a, job = _own_app(db, user, application_id)
    if not a.interview_at:
        raise HTTPException(404, "No interview is scheduled")
    a.interview_at = a.interview_mode = a.interview_link = a.interview_location = a.interview_note = None
    _log(db, a, a.status, a.status, user.id, None, "The interview was cancelled. The recruiter will contact you about next steps.")
    notify(db, a.candidate_id, "Interview cancelled", f"The interview for {job.title} at {job.company.name} was cancelled.",
           "interview", "/candidate/applications")
    db.commit()
    return app_out(db, a, "recruiter")
