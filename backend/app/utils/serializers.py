from pathlib import Path


def iso(d):
    return d.isoformat() if d else None


def avatar_url(user):
    if user and user.avatar_path:
        return f"/api/v1/profiles/{user.id}/avatar?v={Path(user.avatar_path).stem[:8]}"
    return None


def logo_url(company):
    if company and company.logo_path:
        return f"/api/v1/companies/{company.id}/logo?v={Path(company.logo_path).stem[:8]}"
    return None


def user_brief(user):
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "avatar_url": avatar_url(user)}


def company_out(c):
    return {"id": c.id, "name": c.name, "description": c.description, "industry": c.industry, "website": c.website,
            "location": c.location, "size": c.size, "contact_email": c.contact_email, "contact_phone": c.contact_phone,
            "logo_url": logo_url(c)}


def job_out(job, detail=True):
    d = {"id": job.id, "title": job.title, "location": job.location, "employment_type": job.employment_type,
         "experience_level": job.experience_level, "work_arrangement": job.work_arrangement,
         "min_experience": job.min_experience, "education_requirement": job.education_requirement,
         "deadline": iso(job.deadline), "status": job.status, "created_at": iso(job.created_at),
         "required_skills": sorted(s.skill for s in job.skills if s.required),
         "preferred_skills": sorted(s.skill for s in job.skills if not s.required),
         "company": {"id": job.company.id, "name": job.company.name, "logo_url": logo_url(job.company),
                     "location": job.company.location, "industry": job.company.industry,
                     "website": job.company.website, "size": job.company.size}}
    if detail:
        d["description"] = job.description
        d["weights"] = job.weights
    return d
