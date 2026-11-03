from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from app.database.base import Base, utcnow


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)  # candidate | recruiter
    full_name = Column(String, nullable=False)
    avatar_path = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    candidate_profile = relationship("CandidateProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    recruiter_profile = relationship("RecruiterProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
