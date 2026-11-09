import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { RecruiterComms } from "@/components/applications/RecruiterComms";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ScoreBreakdown } from "@/components/matching/ScoreBreakdown";
import { BandBadge, ScoreNumber } from "@/components/matching/Score";
import { Badge, Button, Card, ErrorState, Input, Loading, Select, Textarea } from "@/components/ui";
import { api, openCV } from "@/lib/api";
import { APP_STATUS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/utils";

export default function MatchDetail() {
  const { matchId } = useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [tab, setTab] = useState<"score" | "cv">("score");
  const { data: d, isLoading, error } = useQuery({ queryKey: ["match", matchId], queryFn: () => api.get(`/matching/${matchId}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["match", matchId] }); qc.invalidateQueries({ queryKey: ["rankings"] }); qc.invalidateQueries({ queryKey: ["rec-apps"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); };
  const addNote = useMutation({ mutationFn: () => api.post(`/matching/${matchId}/notes`, { note }), onSuccess: () => { setNote(""); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const delNote = useMutation({ mutationFn: (id: number) => api.del(`/matching/${matchId}/notes/${id}`), onSuccess: refresh, onError: (e: any) => toast.error(e.message) });
  const change = useMutation({ mutationFn: () => api.patch(`/applications/${d.application.id}/status`, { status, reason: reason || null, message: statusMsg.trim() || null }), onSuccess: () => { toast.success("Status updated"); setReason(""); setStatusMsg(""); refresh(); }, onError: (e: any) => toast.error(e.message) });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const app = d.application;
  return (
    <div className="space-y-6">
      <Link to={`/recruiter/rankings/${d.job.id}`} className="text-sm text-muted hover:text-ink">← Back to ranking for {d.job.title}</Link>
      <Card className="flex flex-wrap items-center gap-5">
        <Avatar url={d.candidate.avatar_url} name={d.candidate.name} size={64} />
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold">{d.candidate.name}</h1><p className="text-sm text-muted">{d.candidate.email || "No email found in CV"}{d.candidate.profile?.headline && ` · ${d.candidate.profile.headline}`}</p>
          <div className="mt-2 flex flex-wrap gap-2">{app && <StatusBadge status={app.status} />}{d.needs_review && <Badge tone="amber">Needs manual review</Badge>}{d.cv.duplicate_of && <Badge tone="amber">Duplicate of {d.cv.duplicate_of.filename}</Badge>}</div></div>
        <div className="text-right"><p className="text-xs text-muted">Match for {d.job.title}</p><ScoreNumber score={d.total} size="lg" /><span className="text-muted"> / 100</span><div className="mt-1"><BandBadge score={d.total} /></div></div>
      </Card>
      <div className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-muted"><Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{d.disclaimer}</div>
      {d.needs_review && <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">Extraction was unclear for this CV (very little text or no known skills found). Read the CV yourself before relying on this score.</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex gap-2">{([["score", "Score breakdown"], ["cv", "CV preview"]] as const).map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? "primary" : "outline"} onClick={() => setTab(k)}>{l}</Button>)}</div>
          {tab === "score" ? <ScoreBreakdown components={d.components} evidence={d.evidence} /> : (
            <Card><div className="mb-3 flex items-center justify-between"><h2 className="font-medium">{d.cv.filename}</h2><Button size="sm" variant="outline" onClick={() => openCV(d.cv.id, d.cv.filename).catch((e) => toast.error(e.message))}><Download className="h-3.5 w-3.5" />Open original</Button></div>
              {d.cv.text ? <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed text-ink/90">{d.cv.text}</pre> : <p className="text-sm text-muted">No extracted text available.</p>}</Card>)}
        </div>
        <div className="space-y-4">
          {app && (<Card className="space-y-3"><h2 className="font-medium">Application</h2>
            <Select value={status || app.status} onChange={(e) => setStatus(e.target.value)} disabled={app.status === "withdrawn"}>{Object.entries(APP_STATUS).filter(([k]) => k !== "withdrawn" || app.status === "withdrawn").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
            <Input placeholder="Reason or note (optional, private)" value={reason} onChange={(e) => setReason(e.target.value)} disabled={app.status === "withdrawn"} />
            <Input placeholder="Message to candidate (optional, they can see it)" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} disabled={app.status === "withdrawn"} maxLength={2000} />
            <Button className="w-full" disabled={!status || status === app.status} loading={change.isPending} onClick={() => change.mutate()}>Update status</Button>
            <ol className="space-y-2 border-l border-line pl-4 pt-2">{[...app.history].reverse().map((h: any, i: number) => (
              <li key={i} className="text-xs"><StatusBadge status={h.new_status} /><span className="ml-2 text-muted">{fmtDateTime(h.created_at)} · {h.changed_by}</span>{h.message && <p className="mt-1 text-ink/90">Sent to candidate: “{h.message}”</p>}{h.reason && <p className="mt-1 text-muted">Private: “{h.reason}”</p>}</li>))}</ol></Card>)}
          {app && <RecruiterComms app={app} jobTitle={d.job.title} onDone={refresh} />}
          <Card className="space-y-3"><h2 className="font-medium">Private notes</h2><p className="text-xs text-muted">Only recruiters at your company can see these. Candidates never can.</p>
            <Textarea rows={3} placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} /><Button size="sm" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>Add note</Button>
            <ul className="space-y-2">{d.notes.map((n: any) => (<li key={n.id} className="rounded-xl border border-line bg-surface p-3 text-sm"><p className="whitespace-pre-line">{n.note}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted"><span>{n.author} · {fmtDateTime(n.created_at)}</span>{n.mine && <button aria-label="Delete note" onClick={() => delNote.mutate(n.id)}><Trash2 className="h-3.5 w-3.5 hover:text-rose-300" /></button>}</div></li>))}</ul></Card>
          <Card className="space-y-2 text-sm"><h2 className="font-medium">Extracted from CV</h2>
            <p className="text-muted">Experience: {d.cv.years_experience != null ? `${d.cv.years_experience} years` : "–"}</p><p className="text-muted">Education: <span className="capitalize">{d.cv.education_level || "–"}</span></p></Card>
          {d.candidate.profile && <Card className="space-y-2 text-sm"><h2 className="font-medium">Candidate profile</h2>
            {d.candidate.profile.location && <p className="text-muted">{d.candidate.profile.location}</p>}{d.candidate.profile.summary && <p className="text-muted">{d.candidate.profile.summary}</p>}
            {!!d.candidate.profile.skills.length && <div className="flex flex-wrap gap-1">{d.candidate.profile.skills.map((s: string) => <Badge key={s}>{s}</Badge>)}</div>}
            {["linkedin", "github", "portfolio"].map((k) => d.candidate.profile[k] && <a key={k} href={d.candidate.profile[k]} target="_blank" rel="noreferrer" className="block truncate text-brand hover:underline">{d.candidate.profile[k]}</a>)}</Card>}
        </div>
      </div>
    </div>);
}
