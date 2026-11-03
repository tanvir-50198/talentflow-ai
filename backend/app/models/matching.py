from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from app.database.base import Base, utcnow


class MatchResult(Base):
    __tablename__ = "match_results"
    __table_args__ = (UniqueConstraint("job_id", "cv_id"),)
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True, nullable=False)
    cv_id = Column(Integer, ForeignKey("cvs.id", ondelete="CASCADE"), index=True, nullable=False)
    total = Column(Float, default=0)
    breakdown = Column(JSON, default=list)
    needs_review = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class MatchEvidence(Base):
    __tablename__ = "match_evidence"
    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("match_results.id", ondelete="CASCADE"), index=True)
    component = Column(String)
    label = Column(String)
    found = Column(Boolean, default=True)
    snippet = Column(Text)
    section = Column(String)
    note = Column(Text)


class RecruiterNote(Base):
    __tablename__ = "recruiter_notes"
    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("match_results.id", ondelete="CASCADE"), index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"))
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)
