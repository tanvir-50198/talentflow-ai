from sqlalchemy import JSON, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    phone = Column(String)
    headline = Column(String)
    location = Column(String)
    summary = Column(Text)
    skills = Column(JSON, default=list)
    education = Column(Text)
    experience = Column(Text)
    linkedin = Column(String)
    github = Column(String)
    portfolio = Column(String)
    user = relationship("User", back_populates="candidate_profile")
