from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import get_job_for_recruiter, get_match_for_recruiter, recruiter_only
from app.database.connection import get_db
from app.models import CV, Application, CVExtraction, Job, MatchEvidence, MatchResult, RecruiterNote, User
from app.routers.applications import _history, interview_out
from app.utils.serializers import avatar_url, iso

router = APIRouter(tags=["matching"])
DISCLAIMER = ("Matching scores show how closely a CV matches this one job. They are not hiring recommendations "
              "or hiring probabilities. 'Not found in CV' never means the candidate lacks a skill. Recruiters make every hiring decision.")


class NoteIn(BaseModel):
    note: str = Field(min_length=1, max_length=4000)


def _evidence(db, match_id):
    return [{"id": e.id, "component": e.component, "label": e.label, "found": e.found, "snippet": e.snippet,
             "section": e.section, "note": e.note} for e in db.query(MatchEvidence).filter_by(match_id=match_id).order_by(MatchEvidence.id)]


@router.get("/jobs/{job_id}/candidates")
def rankings(job_id: int, min_score: float | None = None, max_score: float | None = None, skill: str | None = None,
             min_experience: float | None = None, application_status: str | None = None, processing_status: str | None = None,
             user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    job = get_job_for_recruiter(db, user, job_id)
    apps = {a.cv_id: a for a in db.query(Application).filter_by(job_id=job.id)}
    ids = set(apps) | {i for (i,) in db.query(CV.id).filter(CV.job_id == job.id)}
    cvs = db.query(CV).filter(CV.id.in_(ids or [0])).all()
    matches = {m.cv_id: m for m in db.query(MatchResult).filter_by(job_id=job.id)}
    exts = {e.cv_id: e for e in db.query(CVExtraction).filter(CVExtraction.cv_id.in_(ids or [0]))}
    rows = []
    for cv in cvs:
        m, a, e = matches.get(cv.id), apps.get(cv.id), exts.get(cv.id)
        cand = db.get(User, cv.candidate_user_id) if cv.candidate_user_id else None
        ev = db.query(MatchEvidence).filter_by(match_id=m.id).all() if m else []
        scores = {c["key"]: c["score"] for c in (m.breakdown if m else [])}
        maxes = {c["key"]: c["max"] for c in (m.breakdown if m else [])}
        row = {"cv_id": cv.id, "match_id": m.id if m else None, "name": cand.full_name if cand else (cv.candidate_name or cv.filename),
               "email": cand.email if cand else (e.email if e else None), "avatar_url": avatar_url(cand), "total": m.total if m else None,
               "scores": scores, "maxes": maxes,
               "matched_skills": [x.label for x in ev if x.component == "required_skills" and x.found],
               "missing_required": [x.label for x in ev if x.component == "required_skills" and not x.found],
               "evidence_count": sum(1 for x in ev if x.found and x.snippet), "processing_status": cv.status, "error": cv.error,
               "duplicate": cv.status == "duplicate", "needs_review": bool(m.needs_review) if m else False,
               "application_id": a.id if a else None, "application_status": a.status if a else None,
               "years_experience": e.years_experience if e else None, "source": "application" if a else "batch"}
        skills_lc = {s["skill"].lower() for s in (e.skills if e else [])}
        if min_score is not None and (row["total"] is None or row["total"] < min_score): continue
        if max_score is not None and (row["total"] is None or row["total"] > max_score): continue
        if skill and skill.strip().lower() not in skills_lc: continue
        if min_experience is not None and (row["years_experience"] or 0) < min_experience: continue
        if application_status and (row["application_status"] or "none") != application_status: continue
        if processing_status and cv.status != processing_status: continue
        rows.append(row)
    rows.sort(key=lambda r: (r["total"] is None, -(r["total"] or 0)))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return {"job": {"id": job.id, "title": job.title, "status": job.status}, "items": rows, "disclaimer": DISCLAIMER}


@router.get("/matching/{match_id}")
def match_detail(match_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    m = get_match_for_recruiter(db, user, match_id)
    cv, job = db.get(CV, m.cv_id), db.get(Job, m.job_id)
    ext = db.query(CVExtraction).filter_by(cv_id=cv.id).first()
    a = db.query(Application).filter_by(job_id=job.id, cv_id=cv.id).first()
    cand = db.get(User, cv.candidate_user_id) if cv.candidate_user_id else None
    profile = None
    if cand and cand.candidate_profile:
        p = cand.candidate_profile
        profile = {"headline": p.headline, "location": p.location, "summary": p.summary, "skills": p.skills or [],
                   "linkedin": p.linkedin, "github": p.github, "portfolio": p.portfolio, "phone": p.phone}
    notes = [{"id": n.id, "note": n.note, "author": (db.get(User, n.recruiter_id).full_name if n.recruiter_id else None),
              "created_at": iso(n.created_at), "mine": n.recruiter_id == user.id}
             for n in db.query(RecruiterNote).filter_by(match_id=m.id).order_by(RecruiterNote.id.desc())]
    dup = db.get(CV, cv.duplicate_of_id) if cv.duplicate_of_id else None
    return {"id": m.id, "total": m.total, "components": m.breakdown, "needs_review": m.needs_review, "evidence": _evidence(db, m.id),
            "job": {"id": job.id, "title": job.title},
            "candidate": {"name": cand.full_name if cand else (cv.candidate_name or cv.filename), "email": cand.email if cand else (ext.email if ext else None),
                          "avatar_url": avatar_url(cand), "profile": profile},
            "cv": {"id": cv.id, "filename": cv.filename, "status": cv.status, "text": (ext.text[:12000] if ext and ext.text else None),
                   "years_experience": ext.years_experience if ext else None, "education_level": ext.education_level if ext else None,
                   "duplicate_of": {"id": dup.id, "filename": dup.filename} if dup else None},
            "application": {"id": a.id, "status": a.status, "history": _history(db, a, True), "interview": interview_out(a)} if a else None,
            "notes": notes, "disclaimer": DISCLAIMER}


@router.get("/matching/{match_id}/evidence")
def match_evidence(match_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    m = get_match_for_recruiter(db, user, match_id)
    return {"items": _evidence(db, m.id)}


@router.post("/matching/{match_id}/notes", status_code=201)
def add_note(match_id: int, data: NoteIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    m = get_match_for_recruiter(db, user, match_id)
    n = RecruiterNote(match_id=m.id, recruiter_id=user.id, note=data.note.strip())
    db.add(n)
    db.commit()
    return {"id": n.id, "note": n.note, "author": user.full_name, "created_at": iso(n.created_at), "mine": True}


@router.delete("/matching/{match_id}/notes/{note_id}", status_code=204)
def delete_note(match_id: int, note_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    m = get_match_for_recruiter(db, user, match_id)
    n = db.get(RecruiterNote, note_id)
    if not n or n.match_id != m.id or n.recruiter_id != user.id:
        raise HTTPException(404, "Note not found")
    db.delete(n)
    db.commit()
