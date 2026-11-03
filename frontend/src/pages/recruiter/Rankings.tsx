import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BandBadge, ScoreBar, ScoreNumber } from "@/components/matching/Score";
import { Badge, Button, EmptyState, ErrorState, Input, Loading, PageHeader, Select, Table, Td, Th, btn } from "@/components/ui";
import { api } from "@/lib/api";
import { APP_STATUS, DISCLAIMER, PROC_STATUS } from "@/lib/constants";

const KEYS = [["required_skills", "Req"], ["experience", "Exp"], ["education", "Edu"], ["preferred_skills", "Pref"], ["keywords", "Key"]];

export default function Rankings() {
  const { jobId } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ min_score: "", max_score: "", skill: "", min_experience: "", application_status: "", processing_status: "" });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const jobs = useQuery({ queryKey: ["manage-jobs"], queryFn: () => api.get("/jobs/manage/list"), retry: false });
  const { data, isLoading, error } = useQuery({ queryKey: ["rankings", jobId, f], enabled: !!jobId, queryFn: () => api.get(`/jobs/${jobId}/candidates`, f),
    refetchInterval: (q: any) => (q.state.data?.items.some((r: any) => ["pending", "processing"].includes(r.processing_status)) ? 3000 : false) });
  const rescore = useMutation({ mutationFn: () => api.post(`/jobs/${jobId}/rescore`, {}), onSuccess: (r: any) => { toast.success(`Re-scored ${r.rescored} CVs`); qc.invalidateQueries({ queryKey: ["rankings"] }); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div>
      <PageHeader title="Candidate rankings" text="Job-specific matching with evidence from each CV." actions={jobId && <>
        <Button variant="outline" size="sm" loading={rescore.isPending} onClick={() => rescore.mutate()}><RefreshCw className="h-3.5 w-3.5" />Re-score</Button>
        <Link to={`/recruiter/upload?job=${jobId}`} className={btn("primary", "sm")}>Upload CVs</Link></>} />
      <Select className="mb-4 max-w-sm" value={jobId || ""} onChange={(e) => e.target.value && nav(`/recruiter/rankings/${e.target.value}`)}>
        <option value="">Select a job</option>{jobs.data?.items.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select>
      {!jobId ? <EmptyState title="Choose a job to see its ranking" text="Rankings show every screened CV and every application for that job." /> : (<>
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-muted"><Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{DISCLAIMER} Photos and names are never used.</div>
        <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-card/60 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Input type="number" placeholder="Min score" value={f.min_score} onChange={set("min_score")} /><Input type="number" placeholder="Max score" value={f.max_score} onChange={set("max_score")} />
          <Input placeholder="Skill, e.g. Python" value={f.skill} onChange={set("skill")} /><Input type="number" placeholder="Min years exp." value={f.min_experience} onChange={set("min_experience")} />
          <Select value={f.application_status} onChange={set("application_status")}><option value="">Any application status</option><option value="none">Not an applicant</option>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
          <Select value={f.processing_status} onChange={set("processing_status")}><option value="">Any processing status</option>{Object.entries(PROC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        </div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : !data.items.length ? <EmptyState title="No candidates to show" text="Upload CVs for this job, wait for candidates to apply, or loosen the filters." /> : (
          <Table><thead><tr><Th>#</Th><Th>Candidate</Th><Th>Score</Th><Th>Breakdown</Th><Th>Key skills</Th><Th>Status</Th><Th /></tr></thead><tbody>
            {data.items.map((r: any) => (
              <tr key={r.cv_id}><Td className="text-muted">{r.rank}</Td>
                <Td><div className="flex items-center gap-3"><Avatar url={r.avatar_url} name={r.name} size={36} /><div className="min-w-0"><b className="block max-w-[180px] truncate font-medium">{r.name}</b><span className="block max-w-[180px] truncate text-xs text-muted">{r.email || "No email found"}</span></div></div></Td>
                <Td><div className="flex flex-col items-start gap-1"><ScoreNumber score={r.total} />{r.total != null && <BandBadge score={r.total} />}</div></Td>
                <Td><div className="grid w-36 gap-1">{r.total != null ? KEYS.map(([k, l]) => <div key={k} className="flex items-center gap-2 text-[10px] text-muted"><span className="w-6">{l}</span><ScoreBar value={r.scores[k] || 0} max={r.maxes[k] || 1} /></div>) : <span className="text-xs text-muted">–</span>}</div></Td>
                <Td><div className="flex max-w-[200px] flex-wrap gap-1">{r.matched_skills.slice(0, 4).map((s: string) => <Badge key={s} tone="green">{s}</Badge>)}{r.matched_skills.length > 4 && <Badge>+{r.matched_skills.length - 4}</Badge>}
                  {!r.matched_skills.length && r.total != null && <span className="text-xs text-muted">None found</span>}</div><p className="mt-1 text-[11px] text-muted">{r.evidence_count} evidence snippets</p></Td>
                <Td><div className="flex flex-col items-start gap-1">{r.processing_status !== "completed" && <StatusBadge kind="proc" status={r.processing_status} />}
                  {r.application_status ? <StatusBadge status={r.application_status} /> : <span className="text-xs text-muted">Screened CV</span>}
                  {r.needs_review && <Badge tone="amber">Needs manual review</Badge>}</div>{r.error && <p className="mt-1 max-w-[160px] text-[11px] text-muted">{r.error}</p>}</Td>
                <Td>{r.match_id && <Link to={`/recruiter/matches/${r.match_id}`} className={btn("outline", "sm")}>Review</Link>}</Td></tr>))}
          </tbody></Table>)}</>)}
    </div>);
}
