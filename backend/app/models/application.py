from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from app.database.base import Base, utcnow


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id"),)
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True, nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=False)
    status = Column(String, default="applied", index=True)
    # Interview details shown to the candidate (set by the recruiter)
    interview_at = Column(DateTime)
    interview_mode = Column(String)  # "online" | "onsite"
    interview_link = Column(String)  # Google Meet (or other) link when online
    interview_location = Column(String)  # address / room when onsite
    interview_note = Column(Text)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class ApplicationHistory(Base):
    __tablename__ = "application_history"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    previous_status = Column(String)
    new_status = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text)  # private: recruiters only
    message = Column(Text)  # visible to the candidate
    created_at = Column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type = Column(String)
    title = Column(String, nullable=False)
    message = Column(Text)
    link = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
