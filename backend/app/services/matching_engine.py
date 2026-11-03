"""Explainable, job-specific matching. Every component carries a score, an explanation and CV evidence.
Never uses photos, names, gender, age or any protected attribute."""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models import MatchEvidence, MatchResult
from app.services.skill_extractor import find_literal, find_sections, find_skill

EDU_RANK = {"none": 0, "diploma": 1, "bachelor": 2, "master": 3, "phd": 4}
DEFAULT_WEIGHTS = {"required_skills": 40, "experience": 25, "education": 15, "preferred_skills": 10, "keywords": 10}
NAMES = {"required_skills": "Required Skills", "experience": "Relevant Experience", "education": "Education",
         "preferred_skills": "Preferred Skills", "keywords": "Relevant Keywords"}
NOT_FOUND = "Not found in the CV text. This does not mean the candidate lacks this skill."


def resolve_weights(w):
    if isinstance(w, dict) and set(w) == set(DEFAULT_WEIGHTS) and abs(sum(float(v) for v in w.values()) - 100) < 0.01:
        return {k: float(v) for k, v in w.items()}
    return dict(DEFAULT_WEIGHTS)


def _keywords(job_text: str, cv_text: str):
    try:
        vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        m = vec.fit_transform([job_text, cv_text])
        sim = float(cosine_similarity(m[0], m[1])[0][0])
        names, a, b = vec.get_feature_names_out(), m[0].toarray()[0], m[1].toarray()[0]
        common = sorted(((a[i] * b[i], names[i]) for i in range(len(names)) if a[i] > 0 and b[i] > 0), reverse=True)[:8]
        return sim, [n for _, n in common]
    except ValueError:
        return 0.0, []


def score_cv(job, text: str, years: float, edu_level: str, n_skills: int) -> dict:
    w = resolve_weights(job.weights)
    secs = find_sections(text)
    comps, ev = [], []

    def add(key, score, expl, missing=None):
        comps.append({"key": key, "name": NAMES[key], "score": round(score, 1), "max": w[key],
                      "explanation": expl, "missing": missing or []})

    def skills_component(key, skills):
        found, missing = [], []
        for sk in skills:
            hits = find_skill(text, sk, secs)
            if hits:
                found.append(sk)
                ev.append({"component": key, "label": sk, "found": True, "snippet": hits[0]["snippet"],
                           "section": hits[0]["section"], "note": None})
            else:
                missing.append(sk)
                ev.append({"component": key, "label": sk, "found": False, "snippet": None, "section": None, "note": NOT_FOUND})
        if skills:
            add(key, w[key] * len(found) / len(skills),
                f"{len(found)} of {len(skills)} listed {NAMES[key].lower()} were found in the CV text.", missing)
        else:
            add(key, w[key], f"The job lists no {NAMES[key].lower()}, so full marks are given.")

    skills_component("required_skills", sorted({s.skill for s in job.skills if s.required}))

    need = job.min_experience or 0
    if need <= 0:
        add("experience", w["experience"], "The job has no minimum experience, so full marks are given.")
        note = None
    else:
        expl = f"{years:g} years detected in the CV against {need:g} required."
        if years == 0:
            expl += " No experience duration was detected. The CV may not state dates, so this is unverified, not a negative finding."
        add("experience", w["experience"] * min(1.0, years / need), expl)
        note = None if years else "No dates or duration found. Unverified, not a negative finding."
    ev.append({"component": "experience", "label": f"{years:g} years detected" if years else "No experience duration detected",
               "found": years > 0, "snippet": None, "section": None, "note": note})

    req_level = EDU_RANK.get(job.education_requirement or "none", 0)
    cand_level = EDU_RANK.get(edu_level or "none", 0)
    if req_level == 0:
        add("education", w["education"], "The job has no education requirement, so full marks are given.")
    elif cand_level >= req_level:
        add("education", w["education"], f"Education level '{edu_level}' meets the required '{job.education_requirement}'.")
    elif cand_level == 0:
        add("education", 0, f"No degree was detected in the CV; '{job.education_requirement}' is required. This is unverified, not a negative finding.")
    else:
        add("education", w["education"] * cand_level / req_level,
            f"Education level '{edu_level}' is below the required '{job.education_requirement}'.")
    ev.append({"component": "education", "label": edu_level if cand_level else "No degree detected", "found": cand_level > 0,
               "snippet": None, "section": None, "note": None if cand_level else "Not found in the CV text."})

    skills_component("preferred_skills", sorted({s.skill for s in job.skills if not s.required}))

    job_text = " ".join([job.title or "", job.description or ""] + [s.skill for s in job.skills])
    sim, terms = _keywords(job_text, text)
    add("keywords", w["keywords"] * min(1.0, sim / 0.30),
        f"Text similarity between the job description and the CV is {sim:.0%}. Shared terms are listed as evidence.")
    for t in terms:
        hit = find_literal(text, t, secs)
        ev.append({"component": "keywords", "label": t, "found": True,
                   "snippet": hit["snippet"] if hit else None, "section": hit["section"] if hit else None, "note": None})

    total = min(100.0, sum(c["score"] for c in comps))
    return {"total": round(total), "components": comps, "evidence": ev,
            "needs_review": len(text.strip()) < 300 or n_skills == 0}


def compute_and_store(db, job, cv, extraction):
    res = score_cv(job, extraction.text or "", extraction.years_experience or 0,
                   extraction.education_level, len(extraction.skills or []))
    m = db.query(MatchResult).filter_by(job_id=job.id, cv_id=cv.id).first()
    if not m:
        m = MatchResult(job_id=job.id, cv_id=cv.id)
        db.add(m)
        db.flush()
    m.total, m.breakdown, m.needs_review = res["total"], res["components"], res["needs_review"]
    db.query(MatchEvidence).filter_by(match_id=m.id).delete()
    for e in res["evidence"]:
        db.add(MatchEvidence(match_id=m.id, **e))
    db.flush()
    return m
