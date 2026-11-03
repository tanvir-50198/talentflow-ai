import re
from datetime import date
from pathlib import Path

from app.services.skill_extractor import find_sections, section_at


class ProcessingError(Exception):
    pass


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    try:
        if ext == ".pdf":
            import fitz  # PyMuPDF
            with fitz.open(path) as doc:
                return "\n".join(page.get_text() for page in doc)
        if ext == ".docx":
            import docx
            d = docx.Document(str(path))
            parts = [p.text for p in d.paragraphs]
            for t in d.tables:
                for row in t.rows:
                    parts.append(" | ".join(c.text for c in row.cells))
            return "\n".join(parts)
    except Exception as e:  # corrupt / encrypted files
        raise ProcessingError(f"Could not read the file ({type(e).__name__}). It may be corrupt or password protected.")
    raise ProcessingError("Unsupported file type.")


EDU_PATTERNS = [
    ("phd", r"\b(ph\.?\s?d|doctorate|doctoral)\b"),
    ("master", r"\b(master'?s?|msc|m\.sc|mba|m\.eng|m\.tech|m\.s\.)"),
    ("bachelor", r"\b(bachelor'?s?|bsc|b\.sc|b\.eng|b\.tech|b\.s\.|b\.a\.|undergraduate)"),
    ("diploma", r"\b(diploma|associate degree)\b"),
]
EXP_EXPLICIT = re.compile(
    r"(\d{1,2})\+?\s*(?:years?|yrs?)[^.\n]{0,40}experience|experience[^.\n]{0,40}?(\d{1,2})\+?\s*(?:years?|yrs?)", re.I)
RANGE = re.compile(r"((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now)", re.I)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _years_from_ranges(text: str) -> float:
    secs = find_sections(text)
    now = date.today().year
    spans = []
    for m in RANGE.finditer(text):
        sec = (section_at(secs, m.start()) or "").lower()
        if "educat" in sec or "certif" in sec:
            continue
        a = int(m.group(1))
        b = now if m.group(2).lower() in ("present", "current", "now") else int(m.group(2))
        if 0 <= b - a <= 45 and a <= now:
            spans.append((a, b))
    spans.sort()
    total, cur = 0, None
    for a, b in spans:  # union of intervals so overlapping jobs are not double counted
        if cur is None:
            cur = [a, b]
        elif a <= cur[1]:
            cur[1] = max(cur[1], b)
        else:
            total += cur[1] - cur[0]
            cur = [a, b]
    if cur:
        total += cur[1] - cur[0]
    return float(total)


def parse_cv(text: str, filename: str) -> dict:
    explicit = [int(g) for m in EXP_EXPLICIT.finditer(text) for g in m.groups() if g]
    years = min(40.0, max([float(x) for x in explicit] + [_years_from_ranges(text)]))
    edu = "none"
    for level, pat in EDU_PATTERNS:
        if re.search(pat, text, re.I):
            edu = level
            break
    email = (EMAIL.search(text) or [None])[0] if EMAIL.search(text) else None
    name = None
    for line in [l.strip() for l in text.splitlines() if l.strip()][:6]:
        words = line.split()
        if 2 <= len(words) <= 4 and all(re.fullmatch(r"[A-Za-z.'-]+", w) for w in words) \
                and not re.search(r"resume|curriculum|cv|profile|summary|skills", line, re.I):
            name = line
            break
    if not name:
        name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
    return {"years": years, "education_level": edu, "email": email, "name": name}
