from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database.base import Base


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    phone = Column(String)
    job_title = Column(String)
    user = relationship("User", back_populates="recruiter_profile")
