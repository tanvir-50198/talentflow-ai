from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base, utcnow


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String)
    employment_type = Column(String, default="full-time")
    experience_level = Column(String, default="mid")
    work_arrangement = Column(String, default="onsite")
    min_experience = Column(Float, default=0)
    education_requirement = Column(String, default="none")  # none|diploma|bachelor|master|phd
    deadline = Column(Date)
    status = Column(String, default="draft", index=True)  # draft|published|closed
    weights = Column(JSON)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    company = relationship("Company")
    skills = relationship("JobSkill", cascade="all, delete-orphan", lazy="selectin")


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill"),)
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    skill = Column(String, nullable=False)
    required = Column(Boolean, default=True)
