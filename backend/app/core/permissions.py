import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.database.connection import get_db
from app.models import Application, Company, CompanyMember, CV, Job, MatchResult, User

bearer = HTTPBearer(auto_error=False)


def _user(creds: HTTPAuthorizationCredentials | None, db, required: bool):
    if not creds:
        if required:
            raise HTTPException(401, "Not authenticated")
        return None
    try:
        payload = decode_token(creds.credentials, "access")
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, ValueError):
        user = None
    if not user or not user.is_active:
        if required:
            raise HTTPException(401, "Invalid or expired token")
        return None
    return user


def get_current_user(creds=Depends(bearer), db=Depends(get_db)) -> User:
    return _user(creds, db, True)


def optional_user(creds=Depends(bearer), db=Depends(get_db)):
    return _user(creds, db, False)


def require_role(role: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(403, f"Only {role}s can do this")
        return user
    return dep


candidate_only = require_role("candidate")
recruiter_only = require_role("recruiter")


def get_company(db, user: User):
    m = db.query(CompanyMember).filter_by(user_id=user.id).first()
    return db.get(Company, m.company_id) if m else None


def require_company(db, user: User) -> Company:
    c = get_company(db, user)
    if not c:
        raise HTTPException(400, "Create your company profile first")
    return c


def get_job_for_recruiter(db, user: User, job_id: int) -> Job:
    c = require_company(db, user)
    job = db.get(Job, job_id)
    if not job or job.company_id != c.id:
        raise HTTPException(404, "Job not found")
    return job


def company_job_ids(db, user: User) -> set[int]:
    c = get_company(db, user)
    if not c:
        return set()
    return {i for (i,) in db.query(Job.id).filter(Job.company_id == c.id)}


def can_access_cv(db, user: User, cv: CV) -> bool:
    if user.role == "candidate":
        return cv.candidate_user_id == user.id
    ids = company_job_ids(db, user)
    if cv.job_id in ids:
        return True
    return db.query(Application).filter(Application.cv_id == cv.id, Application.job_id.in_(ids)).first() is not None if ids else False


def get_match_for_recruiter(db, user: User, match_id: int) -> MatchResult:
    m = db.get(MatchResult, match_id)
    if not m:
        raise HTTPException(404, "Match not found")
    get_job_for_recruiter(db, user, m.job_id)  # ownership check
    return m
