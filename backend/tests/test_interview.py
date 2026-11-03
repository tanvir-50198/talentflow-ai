from datetime import datetime, timedelta, timezone

from tests.test_flow import make_docx, reg


def _setup(client):
    rec = reg(client, "rec2@x.com", "recruiter", "Rita Two")
    cand = reg(client, "cand3@x.com", "candidate", "Cara Candidate")
    client.post("/api/v1/companies", headers=rec, json={"name": "Beta Corp", "industry": "Software"})
    job = client.post("/api/v1/jobs", headers=rec, json={"title": "Dev", "description": "Build things with Python and FastAPI.",
                      "required_skills": ["Python"], "status": "published"}).json()
    cv = make_docx("Cara Candidate", "Python, FastAPI", "Backend Developer 2019 - 2023")
    up = client.post("/api/v1/cvs/upload", headers=cand, files={"file": ("c.docx", cv, "application/octet-stream")}).json()
    app = client.post(f"/api/v1/jobs/{job['id']}/apply", headers=cand, json={"cv_id": up["id"]}).json()
    return rec, cand, app["id"]


def test_message_and_interview(client):
    rec, cand, appid = _setup(client)
    # message is visible to the candidate, the private reason is not
    r = client.patch(f"/api/v1/applications/{appid}/status", headers=rec, json={"status": "shortlisted", "reason": "secret", "message": "Great CV!"})
    assert r.status_code == 200
    mine = client.get("/api/v1/applications/me", headers=cand).json()["items"][0]
    assert mine["last_message"]["text"] == "Great CV!"
    hist = client.get(f"/api/v1/applications/{appid}", headers=cand).json()["history"]
    assert hist[-1]["message"] == "Great CV!" and hist[-1]["reason"] is None
    assert client.post(f"/api/v1/applications/{appid}/message", headers=cand, json={"message": "hi"}).status_code == 403
    assert client.post(f"/api/v1/applications/{appid}/message", headers=rec, json={"message": "Please send your portfolio"}).status_code == 201
    assert client.get("/api/v1/applications/me", headers=cand).json()["items"][0]["last_message"]["text"] == "Please send your portfolio"

    # interview validation
    when = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    url = f"/api/v1/applications/{appid}/interview"
    assert client.put(url, headers=rec, json={"scheduled_at": past, "mode": "online", "meeting_link": "https://meet.google.com/abc-defg-hij"}).status_code == 400
    assert client.put(url, headers=rec, json={"scheduled_at": when, "mode": "online"}).status_code == 400
    assert client.put(url, headers=rec, json={"scheduled_at": when, "mode": "online", "meeting_link": "javascript:alert(1)"}).status_code == 400
    assert client.put(url, headers=rec, json={"scheduled_at": when, "mode": "onsite"}).status_code == 400
    assert client.put(url, headers=cand, json={"scheduled_at": when, "mode": "onsite", "location": "x"}).status_code == 403

    ok = client.put(url, headers=rec, json={"scheduled_at": when, "mode": "online", "meeting_link": "https://meet.google.com/abc-defg-hij", "note": "Bring ID"})
    assert ok.status_code == 200 and ok.json()["status"] == "interview"
    iv = client.get("/api/v1/applications/me", headers=cand).json()["items"][0]
    assert iv["status"] == "interview" and iv["interview"]["meeting_link"] == "https://meet.google.com/abc-defg-hij"
    assert any(n["type"] == "interview" for n in client.get("/api/v1/notifications", headers=cand).json()["items"])

    # switch to on-site (reschedule) clears the link
    ok = client.put(url, headers=rec, json={"scheduled_at": when, "mode": "onsite", "location": "Gulshan 2, Dhaka"})
    iv = client.get("/api/v1/applications/me", headers=cand).json()["items"][0]["interview"]
    assert iv["mode"] == "onsite" and iv["meeting_link"] is None and iv["location"] == "Gulshan 2, Dhaka"

    # another recruiter cannot touch it
    other = reg(client, "rec3@x.com", "recruiter", "Other Rec")
    client.post("/api/v1/companies", headers=other, json={"name": "Gamma Corp", "industry": "Software"})
    assert client.put(url, headers=other, json={"scheduled_at": when, "mode": "onsite", "location": "x"}).status_code == 404

    assert client.delete(url, headers=rec).status_code == 200
    assert client.get("/api/v1/applications/me", headers=cand).json()["items"][0]["interview"] is None
