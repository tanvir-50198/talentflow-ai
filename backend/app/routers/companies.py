from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import get_company, recruiter_only
from app.database.connection import get_db
from app.models import Company, CompanyMember, User
from app.utils.files import IMG_SIGS, FileError, safe_path, store, validate
from app.utils.serializers import company_out, logo_url

router = APIRouter(prefix="/companies", tags=["companies"])


class CompanyIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str | None = None
    industry: str | None = None
    website: str | None = None
    location: str | None = None
    size: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


@router.get("/me")
def my_company(user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = get_company(db, user)
    return company_out(c) if c else None


@router.post("", status_code=201)
def create_company(data: CompanyIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    if get_company(db, user):
        raise HTTPException(409, "You already manage a company")
    c = Company(**data.model_dump(), created_by=user.id)
    db.add(c)
    db.flush()
    db.add(CompanyMember(company_id=c.id, user_id=user.id))
    db.commit()
    return company_out(c)


@router.put("/{company_id}")
def update_company(company_id: int, data: CompanyIn, user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = get_company(db, user)
    if not c or c.id != company_id:
        raise HTTPException(403, "You can only manage your own company")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return company_out(c)


@router.post("/{company_id}/logo")
async def upload_logo(company_id: int, file: UploadFile = File(...), user: User = Depends(recruiter_only), db: Session = Depends(get_db)):
    c = get_company(db, user)
    if not c or c.id != company_id:
        raise HTTPException(403, "You can only manage your own company")
    content = await file.read(settings.MAX_IMAGE_BYTES + 1)
    try:
        ext = validate(file.filename, content, IMG_SIGS, settings.MAX_IMAGE_BYTES)
    except FileError as e:
        raise HTTPException(400, str(e))
    old = c.logo_path
    c.logo_path = store(settings.LOGO_DIR, content, ext)
    db.commit()
    if old:
        (settings.LOGO_DIR / old).unlink(missing_ok=True)
    return {"logo_url": logo_url(c)}


@router.get("/{company_id}/logo")  # public: logos appear on public job listings
def get_logo(company_id: int, db: Session = Depends(get_db)):
    c = db.get(Company, company_id)
    if not c or not c.logo_path:
        raise HTTPException(404, "No logo")
    return FileResponse(safe_path(settings.LOGO_DIR, c.logo_path), headers={"Cache-Control": "public, max-age=3600"})
