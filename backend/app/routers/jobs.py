from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import exists, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import get_job_for_recruiter, optional_user, recruiter_only, require_company
from app.database.connection import get_db
from app.models import CV, Application, CVBatch, Job, JobSkill, User
from app.services.processor import rescore_job
from app.services.skill_extractor import normalize_skill
from app.utils.serializers import job_out

router = APIRouter(prefix="/jobs", tags=["jobs"])
WEIGHT_KEYS = {"required_skills", "experience", "education", "preferred_skills", "keywords"}


class JobIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=10)
    location: str | None = None
    employment_type: Literal["full-time", "part-time", "contract", "internship", "freelance"] = "full-time"
    experience_level: Literal["entry", "junior", "mid", "senior", "lead"] = "mid"
    work_arrangement: Literal["onsite", "hybrid", "remote"] = "onsite"
    min_experience: float = Field(0, ge=0, le=40)
    education_requirement: Literal["none", "diploma", "bachelor", "master", "phd"] = "none"
    deadline: date | None = None
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    weights: dict[str, float] | None = None
    status: Literal["draft", "published", "closed"] = "draft"

    @model_validator(mode="after")
    def _weights(self):
        if self.weights is not None:
            if set(self.weights) != WEIGHT_KEYS or abs(sum(self.weights.values()) - 100) > 0.01:
                raise ValueError("weights must include all five components and add up to 100")
        return self


class StatusIn(BaseModel):
    status: Literal["draft", "published", "closed"]


def _apply_skills(job: Job, required: list[str], preferred: list[str]):
    seen, skills = set(), []
    for names, req in ((required, True), (preferred, False)):
        for n in names:
            n = normalize_skill(n)
            if n and n.lower() not in seen:
                seen.add(n.lower())
                skills.append(JobSkill(skill=n, required=req))
    job.skills.clear()
    job.skills.extend(skills)


@router.get("")
def list_jobs(q: str | None = None, location: str | None = None, employment_type: str | None = None,
              experience_level: str | None = None, skill: str | None = None, company: str | None = None,
              work_arrangement: str | None = None, sort: str = "newest", db: Session = Depends(get_db)):
    qs = db.query(Job).join(Job.company).options(joinedload(Job.company)).filter(
        Job.status == "published", or_(Job.deadline.is_(None), Job.deadline >= date.today()))
    if q:
        qs = qs.filter(Job.title.ilike(f"%{q}%"))
    if location:
        qs = qs.filter(Job.location.ilike(f"%{location}%"))
    if employment_type:
        qs = qs.filter(Job.employment_type == employment_type)
    if experience_level:
        qs = qs.filter(Job.experience_level == experience_level)
    if work_arrangement:
        qs = qs.filter(Job.work_arrangement == work_arrangement)
    if company:
        from app.models import Company
        qs = qs.filter(Company.name.ilike(f"%{company}%"))
    if skill:
        qs = qs.filter(exists().where((JobSkill.job_id == Job.id) & (JobSkill.skill.ilike(f"%{normalize_skill(skill)}%"))))
    items = qs.order_by(Job.created_at.desc()).all()
    return {"items": [job_out(j, detail=False) for j in items], "total": len(items)}


@router.get("/manage/list")
def manage_list(user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = require_company(db, user)
    out = []
    for j in db.query(Job).filter_by(company_id=c.id).order_by(Job.created_at.desc()).all():
        d = job_out(j, detail=False)
        d["applications"] = db.query(func.count(Application.id)).filter_by(job_id=j.id).scalar()
        d["cvs"] = db.query(func.count(CV.id)).filter(CV.job_id == j.id, CV.batch_id.isnot(None)).scalar()
        out.append(d)
    return {"items": out}


@router.get("/{job_id}")
def get_job(job_id: int, user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != "published":
        if not (user and user.role == "recruiter" and _owns(db, user, job)):
            raise HTTPException(404, "Job not found")
    return job_out(job)


def _owns(db, user, job):
    from app.core.permissions import get_company
    c = get_company(db, user)
    return bool(c and c.id == job.company_id)


@router.post("", status_code=201)
def create_job(data: JobIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = require_company(db, user)
    vals = data.model_dump(exclude={"required_skills", "preferred_skills"})
    job = Job(company_id=c.id, created_by=user.id, **vals)
    _apply_skills(job, data.required_skills, data.preferred_skills)
    db.add(job)
    db.commit()
    return job_out(job)


@router.put("/{job_id}")
def update_job(job_id: int, data: JobIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    job = get_job_for_recruiter(db, user, job_id)
    for k, v in data.model_dump(exclude={"required_skills", "preferred_skills"}).items():
        setattr(job, k, v)
    _apply_skills(job, data.required_skills, data.preferred_skills)
    db.flush()
    rescore_job(db, job)  # requirements changed -> refresh scores and evidence
    db.commit()
    return job_out(job)


@router.patch("/{job_id}/status")
def set_status(job_id: int, data: StatusIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    job = get_job_for_recruiter(db, user, job_id)
    job.status = data.status
    db.commit()
    return job_out(job, detail=False)


@router.post("/{job_id}/rescore")
def rescore(job_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    job = get_job_for_recruiter(db, user, job_id)
    n = rescore_job(db, job)
    db.commit()
    return {"rescored": n}


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    job = get_job_for_recruiter(db, user, job_id)
    if db.query(Application).filter_by(job_id=job.id).first() or db.query(CV).filter_by(job_id=job.id).first() \
            or db.query(CVBatch).filter_by(job_id=job.id).first():
        raise HTTPException(409, "This job has applications or CVs. Close it instead of deleting it.")
    db.delete(job)
    db.commit()
