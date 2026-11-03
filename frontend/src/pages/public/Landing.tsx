import { BarChart3, CheckSquare, FileSearch, Lock, Scale, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { PublicHeader } from "@/layouts/PublicLayout";
import { btn } from "@/components/ui";

const ranked = [
  { i: "AK", n: "Candidate A. K.", s: "Strong match · 7 yrs backend", v: 92, c: "text-emerald-300" },
  { i: "MR", n: "Candidate M. R.", s: "Strong match · 6 yrs backend", v: 87, c: "text-emerald-300" },
  { i: "SN", n: "Candidate S. N.", s: "Review · 3 yrs, partial skills", v: 74, c: "text-amber-300" },
  { i: "TH", n: "Candidate T. H.", s: "Needs manual review · scanned PDF", v: "–", c: "text-muted" },
];
const bars = [["Skills", 95], ["Experience", 90], ["Education", 85], ["Certifications", 100]];
const features = [
  [FileSearch, "Accurate skill matching", "A curated alias dictionary with word-boundary matching, so “Go”, “R” or “Java” never match the wrong thing.", "Recruiters"],
  [Scale, "Fair by design", "Photo, name, gender and age never enter the score. Missing information is never treated as a missing skill.", "Everyone"],
  [UserRound, "Candidate profiles", "Build a profile, manage your CVs, browse open jobs, apply and follow the status of every application.", "Candidates"],
  [CheckSquare, "Review and notes", "Private recruiter notes, status history and one-click re-scoring when job requirements change.", "Recruiters"],
  [Lock, "Private and audited", "Private file storage, ownership checks on every request and a status history for each application.", "Everyone"],
  [BarChart3, "Recruitment analytics", "Track jobs, processed CVs, applications and candidate status from one dashboard built on real records.", "Recruiters"],
] as const;
const steps = [
  ["Create a job", "List the required and preferred skills, experience and education, and set the weight of each."],
  ["Upload CVs", "Drag in up to 50 PDF or DOCX files. Candidates can also apply directly with their own profile."],
  ["Parse and score", "A background worker reads each CV, matches skills and scores it against the job. You watch progress live."],
  ["Review the ranking", "See the ranked list with the breakdown and CV evidence. Unclear files go to manual review."],
  ["Decide", "Shortlist, add notes and move candidates through your pipeline. Every decision is yours."],
];
const bands = [["90 and above", "Strong", "bg-emerald-400"], ["80 to 89", "Good", "bg-teal-300"], ["60 to 79", "Review", "bg-amber-400"], ["Below 60", "Low", "bg-rose-400"]];

export default function Landing() {
  return (
    <div className="page-glow relative min-h-screen overflow-hidden" id="home">
      <PublicHeader />
      <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 text-center">
        <div className="hero-arc" />
        <span className="relative inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1 text-xs"><i className="h-1.5 w-1.5 rounded-full bg-brand" />Explainable CV ranking</span>
        <h1 className="relative mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          <span className="bg-gradient-to-b from-emerald-200 to-brand bg-clip-text text-transparent">Rank every CV.</span><br />Understand every score.
        </h1>
        <p className="relative mx-auto mt-6 max-w-xl text-muted">Upload up to 50 CVs per batch and get a job-specific ranking. Every score comes with a breakdown and evidence from the CV, so you can see why and make the call yourself.</p>
        <div className="relative mt-8 flex justify-center gap-3">
          <Link to="/register" className={btn("primary", "lg")}>Get Started</Link>
          <a href="#how" className={btn("light", "lg")}>See How It Works</a>
        </div>
        <p className="relative mt-4 text-xs text-muted">Decision support for recruiters. You make every hiring decision.</p>

        <div className="relative mx-auto mt-14 max-w-4xl text-left">
          <div className="absolute -left-3 -top-6 z-10 hidden rounded-xl border border-brand/30 bg-card px-4 py-2 text-xs sm:block"><b className="block text-sm">Scoring batch</b><span className="text-muted">Live progress, per file</span></div>
          <div className="absolute -right-3 -top-6 z-10 hidden rounded-xl border border-brand/30 bg-card px-4 py-2 text-xs sm:block"><span className="text-muted">CVs processed</span><b className="block text-lg">46 / 50</b></div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_0_80px_-20px_rgba(16,185,129,.35)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-muted"><span>Jobs / Senior Backend Engineer / Ranking</span><span className="rounded-md border border-line px-2 py-0.5">Example data</span></div>
            <div className="grid md:grid-cols-2">
              <div className="space-y-2 border-line p-4 md:border-r">
                <div className="mb-1 flex justify-between text-sm font-medium">Ranked applicants<span className="rounded-md border border-line px-2 text-[10px] font-normal text-muted">Deterministic engine v1</span></div>
                {ranked.map((r, i) => (
                  <div key={r.i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${i === 0 ? "border-brand/50 bg-brand/5" : "border-line"}`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-xs font-semibold text-brand">{r.i}</span>
                    <span className="flex-1 text-sm"><b className="block font-medium">{r.n}</b><span className="text-xs text-muted">{r.s}</span></span>
                    <b className={r.c}>{r.v}</b>
                  </div>))}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex justify-between text-sm font-medium">Why 92?<span className="rounded-md border border-line px-2 text-[10px] font-normal text-muted">Photos hidden</span></div>
                {bars.map(([l, v]) => (
                  <div key={l as string} className="flex items-center gap-3 text-xs"><span className="w-24 text-muted">{l}</span>
                    <span className="h-1.5 flex-1 rounded-full bg-white/10"><span className="block h-full rounded-full bg-brand" style={{ width: `${v}%` }} /></span><span className="w-6 text-right">{v}</span></div>))}
                <div className="rounded-xl border border-line p-3 text-xs"><p>“Built a <mark className="rounded bg-brand/20 px-1 text-brand">FastAPI</mark> service with <mark className="rounded bg-brand/20 px-1 text-brand">PostgreSQL</mark> handling 2M requests a day.”</p>
                  <p className="mt-2 text-muted">Evidence · page 1, Experience section · shown in context</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-left md:grid-cols-4">
          {[["Up to 50 CVs", "per batch, tracked per file"], ["Evidence for every score", "snippets taken from the CV"], ["Fair by design", "photos and names are excluded"], ["You decide", "no auto-reject, ever"]].map(([a, b]) => (
            <div key={a} className="bg-card px-5 py-4"><b className="block text-sm">{a}</b><span className="text-xs text-muted">{b}</span></div>))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-16">
        <p className="text-xs font-medium text-brand">Features</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight">Built so you can check the machine’s work</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map(([Icon, t, d, tag]) => (
            <div key={t} className="flex flex-col rounded-2xl border border-line bg-card/70 p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><Icon className="h-4 w-4" /></span>
              <h3 className="mt-4 font-medium">{t}</h3><p className="mt-1.5 flex-1 text-sm text-muted">{d}</p>
              <span className="mt-4 w-fit rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">{tag}</span>
            </div>))}
        </div>
        <p className="mt-4 text-xs text-muted">Coming later: interview scheduling, OCR for scanned CVs, an optional LLM layer for extraction and explanation, and email notifications.</p>
      </section>

      <section id="how" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-16">
        <p className="text-xs font-medium text-brand">How it works</p>
        <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight">From job post to ranked shortlist in five steps</h2>
        <p className="mt-3 max-w-lg text-sm text-muted">Each step is visible, so you always know what the system did and what is left for you.</p>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <ol className="space-y-6">
            {steps.map(([t, d], i) => (
              <li key={t} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-sm text-brand">{i + 1}</span>
                <div><b className="text-sm">{t}</b><p className="mt-1 text-sm text-muted">{d}</p></div></li>))}
          </ol>
          <div className="h-fit rounded-2xl border border-line bg-card/70 p-6">
            <h3 className="font-semibold">What a score means</h3>
            <p className="mt-1 text-sm text-muted">A matching score for one job. It is not a prediction of hiring success. “Not found in CV” never means a person lacks the skill.</p>
            <div className="mt-4 space-y-2">{bands.map(([r, l, c]) => <div key={r} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><i className={`h-2 w-2 rounded-full ${c}`} /><b>{r}</b><span className="text-muted">{l}</span></div>)}</div>
            <p className="mt-4 text-xs text-muted"><span className="mr-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-amber-300">Needs manual review</span>Appears whenever extraction is unclear, whatever the score.</p>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-5xl px-4 pb-20">
        <div className="rounded-3xl border border-brand/20 bg-gradient-to-b from-brand/10 to-transparent px-6 py-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Spend your time on people, not on piles of CVs</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">TalentFlow AI is a decision-support platform. It shows its work, and recruiters make every hiring decision.</p>
          <div className="mt-6 flex justify-center gap-3"><Link to="/register" className={btn("primary", "lg")}>Create a free account</Link><Link to="/jobs" className={btn("outline", "lg")}>Browse jobs</Link></div>
        </div>
      </section>
      <footer className="border-t border-line px-6 py-8"><div className="mx-auto flex max-w-5xl items-center justify-between text-xs text-muted"><Logo /><span>© {new Date().getFullYear()} TalentFlow AI</span></div></footer>
    </div>);
}
