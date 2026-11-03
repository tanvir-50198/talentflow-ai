from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from app.database.base import Base, utcnow


class CVBatch(Base):
    __tablename__ = "cv_batches"
    id = Column(Integer, primary_key=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)
    created_at = Column(DateTime, default=utcnow)


class CV(Base):
    __tablename__ = "cvs"
    id = Column(Integer, primary_key=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), index=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), index=True)  # set when a candidate owns the CV
    batch_id = Column(Integer, ForeignKey("cv_batches.id"), index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)  # screening target for recruiter uploads
    filename = Column(String, nullable=False)
    stored_name = Column(String)
    file_hash = Column(String, index=True)
    size = Column(Integer, default=0)
    status = Column(String, default="pending", index=True)  # pending|processing|completed|failed|duplicate
    error = Column(String)
    retryable = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    candidate_name = Column(String)
    duplicate_of_id = Column(Integer, ForeignKey("cvs.id"))
    created_at = Column(DateTime, default=utcnow)


class CVExtraction(Base):
    __tablename__ = "cv_extractions"
    id = Column(Integer, primary_key=True)
    cv_id = Column(Integer, ForeignKey("cvs.id", ondelete="CASCADE"), unique=True, index=True)
    text = Column(Text)
    skills = Column(JSON, default=list)  # [{skill, snippet, section}]
    years_experience = Column(Float, default=0)
    education_level = Column(String, default="none")
    email = Column(String)
    created_at = Column(DateTime, default=utcnow)
