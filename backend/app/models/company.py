from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from app.database.base import Base, utcnow


class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    industry = Column(String)
    website = Column(String)
    location = Column(String)
    size = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    logo_path = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=utcnow)


class CompanyMember(Base):
    __tablename__ = "company_members"
    __table_args__ = (UniqueConstraint("company_id", "user_id"),)
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
