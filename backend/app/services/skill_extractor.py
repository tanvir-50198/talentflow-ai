"""Alias-dictionary + regex skill extraction (v1: no spaCy, no paid AI API)."""
import re
from functools import lru_cache

# canonical name -> aliases. Matching is case-insensitive with word boundaries,
# except aliases of 1-2 characters (e.g. "JS", "ML"), which must match exactly.
ALIASES = {
    "Python": ["Python 3", "Python3"], "Java": [], "JavaScript": ["JS", "ECMAScript", "ES6"],
    "TypeScript": ["TS"], "Go": ["Golang"], "Rust": [], "Kotlin": [], "Swift": [], "Scala": [],
    "PHP": [], "Ruby": [], "Ruby on Rails": ["Rails", "RoR"], "C#": ["CSharp", "C Sharp"],
    "C++": ["CPP"], "C": ["C programming", "C language", "ANSI C"], "R": ["R language", "R programming", "RStudio"],
    ".NET": ["dotnet", "ASP.NET", ".NET Core"], "SQL": ["T-SQL", "PL/SQL"],
    "React": ["React.js", "ReactJS", "React JS"], "Next.js": ["NextJS", "Next JS"],
    "Vue": ["Vue.js", "VueJS", "Vue 3"], "Angular": ["AngularJS", "Angular.js"],
    "Node.js": ["NodeJS", "Node JS"], "Express": ["Express.js", "ExpressJS"],
    "FastAPI": ["FastAPI Framework", "Fast API"], "Django": ["Django REST Framework", "DRF"],
    "Flask": [], "Spring Boot": ["SpringBoot", "Spring Framework"], "Laravel": [],
    "PostgreSQL": ["Postgres", "PostgreSQL DB", "Postgre SQL"], "MySQL": ["My SQL", "MariaDB"],
    "SQLite": [], "MongoDB": ["Mongo", "Mongo DB"], "Redis": [], "Elasticsearch": ["Elastic Search", "ELK"],
    "Docker": ["Docker Compose", "Dockerfile"], "Kubernetes": ["K8s"], "AWS": ["Amazon Web Services", "EC2"],
    "Azure": ["Microsoft Azure"], "GCP": ["Google Cloud", "Google Cloud Platform"], "Terraform": [],
    "Ansible": [], "Jenkins": [], "CI/CD": ["CI CD", "Continuous Integration", "GitHub Actions", "GitLab CI"],
    "Git": [], "Linux": ["Unix"], "REST API": ["RESTful", "RESTful API", "REST APIs", "REST"],
    "GraphQL": [], "gRPC": [], "Microservices": ["Microservice", "Micro-services"],
    "HTML": ["HTML5"], "CSS": ["CSS3"], "Tailwind CSS": ["Tailwind", "TailwindCSS"], "Sass": ["SCSS"],
    "Redux": [], "Machine Learning": ["ML"], "Deep Learning": [], "NLP": ["Natural Language Processing"],
    "TensorFlow": [], "PyTorch": [], "scikit-learn": ["sklearn", "Scikit Learn"], "Pandas": [], "NumPy": [],
    "Data Analysis": ["Data Analytics"], "Tableau": [], "Power BI": ["PowerBI"],
    "Excel": ["Microsoft Excel", "MS Excel"], "Agile": ["Scrum"], "Jira": [], "Figma": [],
    "UI/UX": ["UX Design", "UI Design"], "Pytest": [], "Jest": [], "Selenium": [],
    "Project Management": ["PMP"], "Leadership": [], "Communication": ["Communication skills"],
}
# Canonical names too short/ambiguous to search for literally; only their explicit aliases are used.
AMBIGUOUS = {"Go", "R", "C"}

_CANON = {}
for _c, _al in ALIASES.items():
    for _a in [_c] + _al:
        _CANON.setdefault(_a.lower(), _c)

HEADING_RE = re.compile(
    r"^\s*(professional summary|summary|profile|objective|technical skills|skills|core competencies|"
    r"work experience|professional experience|experience|employment history|projects?|project experience|"
    r"education|certifications?|achievements|languages|publications)\s*:?\s*$", re.I | re.M)


def normalize_skill(name: str) -> str:
    n = (name or "").strip()
    return _CANON.get(n.lower(), n)


@lru_cache(maxsize=512)
def _patterns(canonical: str):
    names = ([] if canonical in AMBIGUOUS else [canonical]) + ALIASES.get(canonical, [])
    if canonical not in ALIASES:  # custom skill typed by a recruiter: match it literally
        names = [canonical]
    pats = []
    for n in sorted(set(names), key=len, reverse=True):
        flags = 0 if len(n) <= 2 else re.I
        pats.append(re.compile(r"(?<![A-Za-z0-9])" + re.escape(n) + r"(?![A-Za-z0-9+#])", flags))
    return pats


def find_sections(text: str):
    return [(m.start(), m.group(1).title()) for m in HEADING_RE.finditer(text)]


def section_at(sections, pos: int):
    cur = None
    for start, title in sections:
        if start <= pos:
            cur = title
        else:
            break
    return cur


def _snippet(text: str, s: int, e: int) -> str:
    ls = text.rfind("\n", 0, s) + 1
    le = text.find("\n", e)
    le = len(text) if le == -1 else le
    return text[ls:le].strip()[:240]


def find_skill(text: str, skill: str, sections=None, limit: int = 2):
    canonical = normalize_skill(skill)
    sections = sections if sections is not None else find_sections(text)
    hits = []
    for p in _patterns(canonical):
        for m in p.finditer(text):
            hits.append({"skill": canonical, "snippet": _snippet(text, m.start(), m.end()),
                         "section": section_at(sections, m.start()), "pos": m.start()})
            if len(hits) >= limit:
                break
    hits.sort(key=lambda h: h["pos"])
    return hits[:limit]


def find_literal(text: str, term: str, sections=None):
    m = re.search(r"(?<![A-Za-z0-9])" + re.escape(term) + r"(?![A-Za-z0-9])", text, re.I)
    if not m:
        return None
    sections = sections if sections is not None else find_sections(text)
    return {"snippet": _snippet(text, m.start(), m.end()), "section": section_at(sections, m.start())}


def extract_skills(text: str):
    """Return [{skill, snippet, section}] for every dictionary skill found in the CV text."""
    sections = find_sections(text)
    out = []
    for canonical in ALIASES:
        hits = find_skill(text, canonical, sections, limit=1)
        if hits:
            h = hits[0]
            out.append({"skill": canonical, "snippet": h["snippet"], "section": h["section"]})
    return out
