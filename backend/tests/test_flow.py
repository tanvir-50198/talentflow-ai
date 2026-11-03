import io

import docx

PW = "Password123!"


def make_docx(name, skills, exp_line):
    d = docx.Document()
    for line in [name, "SKILLS", skills, "EXPERIENCE", exp_line, "EDUCATION", "Bachelor of Science in Computer Science, 2014 - 2018"]:
        d.add_paragraph(line)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def reg(client, email, role, name):
    r = client.post("/api/v1/auth/register", json={"email": email, "password": PW, "full_name": name, "role": role})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_full_flow(client):
    rec = reg(client, "rec@x.com", "recruiter", "Rita Recruiter")
    cand = reg(client, "cand@x.com", "candidate", "Carl Candidate")
    # role enforcement is done by the backend
    assert client.post("/api/v1/jobs", headers=cand, json={}).status_code == 403
    assert client.post("/api/v1/jobs", headers=rec, json={"title": "Dev", "description": "long enough text"}).status_code == 400
    assert client.post("/api/v1/companies", headers=rec, json={"name": "Acme Corp", "industry": "Software"}).status_code == 201
    job = client.post("/api/v1/jobs", headers=rec, json={
        "title": "Backend Engineer", "description": "Build REST APIs with Python and FastAPI on PostgreSQL.",
        "required_skills": ["Python", "fastapi", "Postgres", "Docker"], "preferred_skills": ["React.js"],
        "min_experience": 3, "education_requirement": "bachelor", "status": "published"}).json()
    assert "PostgreSQL" in job["required_skills"]  # alias normalised
    # bulk upload: 2 good CVs, 1 duplicate, 1 invalid type
    a = make_docx("Alice Johnson", "Python, FastAPI Framework, PostgreSQL DB, Docker", "Backend Developer 2019 - 2023\nBuilt REST API with FastAPI")
    b = make_docx("Bob Smith", "JavaScript, ReactJS", "Frontend Developer 2022 - 2023")
    files = [("files", ("alice.docx", a, "application/octet-stream")), ("files", ("bob.docx", b, "application/octet-stream")),
             ("files", ("alice_copy.docx", a, "application/octet-stream")), ("files", ("notes.txt", b"hello", "text/plain"))]
    r = client.post("/api/v1/batches", headers=rec, data={"job_id": job["id"]}, files=files)
    assert r.status_code == 201, r.text
    bid = r.json()["id"]
    batch = client.get(f"/api/v1/batches/{bid}", headers=rec).json()
    assert batch["status"] == "completed" and batch["counts"] == {"pending": 0, "processing": 0, "completed": 2, "failed": 1, "duplicate": 1}
    rows = client.get(f"/api/v1/jobs/{job['id']}/candidates", headers=rec).json()["items"]
    top = rows[0]
    assert top["name"] == "Alice Johnson" and top["total"] > rows[1]["total"]
    assert {"Python", "FastAPI", "PostgreSQL", "Docker"} == set(top["matched_skills"])
    detail = client.get(f"/api/v1/matching/{top['match_id']}", headers=rec).json()
    assert sum(c["max"] for c in detail["components"]) == 100 and detail["evidence"]
    assert client.post(f"/api/v1/matching/{top['match_id']}/notes", headers=rec, json={"note": "Strong"}).status_code == 201
    # candidate side
    up = client.post("/api/v1/cvs/upload", headers=cand, files={"file": ("me.docx", a, "application/octet-stream")})
    assert up.status_code == 201 and up.json()["status"] == "completed"
    ap = client.post(f"/api/v1/jobs/{job['id']}/apply", headers=cand, json={"cv_id": up.json()["id"]})
    assert ap.status_code == 201
    assert client.post(f"/api/v1/jobs/{job['id']}/apply", headers=cand, json={"cv_id": up.json()["id"]}).status_code == 409
    appid = ap.json()["id"]
    assert client.patch(f"/api/v1/applications/{appid}/status", headers=cand, json={"status": "offered"}).status_code == 403
    assert client.patch(f"/api/v1/applications/{appid}/status", headers=rec, json={"status": "shortlisted", "reason": "great"}).status_code == 200
    hist = client.get(f"/api/v1/applications/{appid}", headers=cand).json()["history"]
    assert [h["new_status"] for h in hist] == ["applied", "shortlisted"] and hist[1]["reason"] is None  # candidates never see reasons
    notes = client.get("/api/v1/notifications", headers=cand).json()
    assert notes["unread"] >= 2
    # privacy: candidates cannot read rankings or other people's CVs
    assert client.get(f"/api/v1/jobs/{job['id']}/candidates", headers=cand).status_code == 403
    assert client.get(f"/api/v1/cvs/{up.json()['id']}/download", headers=rec).status_code == 200  # applicant CV is visible to the job's recruiter
    other = reg(client, "cand2@x.com", "candidate", "Other Person")
    assert client.get(f"/api/v1/cvs/{up.json()['id']}/download", headers=other).status_code == 404
    an = client.get("/api/v1/analytics/recruiter", headers=rec).json()
    assert an["applications"] == 1 and an["processed_cvs"] == 2 and an["failed_cvs"] == 1 and an["duplicate_cvs"] == 1


def test_avatar_validation(client):
    h = reg(client, "av@x.com", "candidate", "Ava Vee")
    assert client.post("/api/v1/profiles/me/avatar", headers=h, files={"file": ("x.png", b"not an image", "image/png")}).status_code == 400
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 50
    r = client.post("/api/v1/profiles/me/avatar", headers=h, files={"file": ("x.png", png, "image/png")})
    assert r.status_code == 200 and r.json()["avatar_url"]
    assert client.get(r.json()["avatar_url"].split("?")[0], headers=h).status_code == 200
    assert client.get("/api/v1/profiles/1/avatar").status_code == 401  # private storage
