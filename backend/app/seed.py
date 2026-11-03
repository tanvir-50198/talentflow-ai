"""Optional demo data: python -m app.seed"""
from datetime import date, timedelta

from app.core.security import hash_password
from app.database.connection import SessionLocal, init_db
from app.models import CandidateProfile, Company, CompanyMember, Job, JobSkill, RecruiterProfile, User

PW = "Password123!"


def run():
    init_db()
    db = SessionLocal()
    if db.query(User).filter_by(email="recruiter@demo.com").first():
        print("Demo data already exists.")
        return
    r = User(email="recruiter@demo.com", password_hash=hash_password(PW), role="recruiter", full_name="Rina Recruiter")
    r.recruiter_profile = RecruiterProfile(job_title="Talent Lead")
    c = User(email="candidate@demo.com", password_hash=hash_password(PW), role="candidate", full_name="Carl Candidate")
    c.candidate_profile = CandidateProfile(headline="Backend developer", location="Dhaka", skills=["Python", "FastAPI"])
    db.add_all([r, c])
    db.flush()
    co = Company(name="Northwind Labs", industry="Software", location="Dhaka", size="51-200", website="https://example.com",
                 description="We build data tools for logistics teams.", created_by=r.id)
    db.add(co)
    db.flush()
    db.add(CompanyMember(company_id=co.id, user_id=r.id))
    specs = [("Senior Backend Engineer", "Build and scale REST APIs and data pipelines for our logistics platform. You will own services end to end.",
              ["Python", "FastAPI", "PostgreSQL", "REST API"], ["Docker", "AWS"], 5, "bachelor"),
             ("Frontend Developer", "Build accessible, fast interfaces with React and TypeScript for our dashboard product.",
              ["React", "TypeScript", "HTML", "CSS"], ["Tailwind CSS", "Jest"], 2, "none")]
    for title, desc, req, pref, exp, edu in specs:
        j = Job(company_id=co.id, created_by=r.id, title=title, description=desc, location="Dhaka", status="published",
                min_experience=exp, education_requirement=edu, deadline=date.today() + timedelta(days=45))
        j.skills = [JobSkill(skill=s, required=True) for s in req] + [JobSkill(skill=s, required=False) for s in pref]
        db.add(j)
    db.commit()
    print(f"Created recruiter@demo.com and candidate@demo.com (password: {PW})")


if __name__ == "__main__":
    run()
