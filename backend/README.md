# TalentFlow AI

Explainable recruitment decision-support platform (ATS) with job-specific, evidence-backed CV matching.
Scores assist recruiters. They never make hiring decisions.

```
talentflow-ai/
├── backend/    FastAPI + SQLAlchemy + SQLite  (API on :8000)
└── frontend/   React + TypeScript + Vite + Tailwind  (UI on :5173)
```

The two folders are fully independent. Run them in two terminals.

## 1. Backend (Windows PowerShell)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          # then edit SECRET_KEY
python -m app.seed              # optional demo data
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- SQLite database is created automatically as `backend/talentflow.db`
- Private files live in `backend/storage/` (never served statically)
- Tests: `pytest`

macOS/Linux: use `source venv/bin/activate` and `cp .env.example .env`.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on port 8000.
For production set `VITE_API_ORIGIN` (see `.env.example`) and run `npm run build`.

## Demo accounts (after `python -m app.seed`)

| Role      | Email                | Password     |
|-----------|----------------------|--------------|
| Recruiter | recruiter@demo.com   | Password123! |
| Candidate | candidate@demo.com   | Password123! |

## Roles

- **Candidate**: profile + picture, multiple CVs (default, replace, delete, download), job search/filter, apply, track and withdraw applications, notifications.
- **Recruiter**: profile + picture, company profile + logo, job management, bulk CV upload (max 50, per-file status, retry), job-specific rankings with score breakdown and CV evidence, duplicate flags, private notes, status history, analytics.

Both roles have a profile picture (upload with preview, replace, remove, initials fallback). Pictures, names and other personal attributes are never used in scoring.

## How matching works (v1)

1. Text extracted with PyMuPDF (PDF) or python-docx (DOCX).
2. Skills found with an alias dictionary and word-boundary regex (`app/services/skill_extractor.py`).
3. Score = Required skills 40 + Experience 25 + Education 15 + Preferred skills 10 + Keywords 10 (weights configurable per job).
4. Every component stores an explanation and CV snippets as evidence. "Not found in CV" is never treated as "lacks the skill".

## Notes

- Authorization is enforced in the backend (role checks, company ownership, candidate ownership).
- Batch processing uses FastAPI background tasks. The UI polls every 2 seconds.
- Set `DEBUG=0` in production. In debug mode the password-reset token is returned by the API (no email service in v1).
- Back up SQLite nightly with `sqlite3 talentflow.db ".backup backup.db"`.
