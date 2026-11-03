import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button, Card, EmptyState, Field, Loading, PageHeader, Select, Table, Td, Th, btn } from "@/components/ui";
import { ScoreNumber } from "@/components/matching/Score";
import { api } from "@/lib/api";
import { fmtDateTime, fmtSize } from "@/lib/utils";

const MAX = 50;

export default function Upload() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const batchId = sp.get("batch");
  const [jobId, setJobId] = useState(sp.get("job") || "");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const jobs = useQuery({ queryKey: ["manage-jobs"], queryFn: () => api.get("/jobs/manage/list"), retry: false });
  const batches = useQuery({ queryKey: ["batches"], queryFn: () => api.get("/batches") });
  const batch = useQuery({ queryKey: ["batch", batchId], enabled: !!batchId, queryFn: () => api.get(`/batches/${batchId}`),
    refetchInterval: (q: any) => (q.state.data?.status === "processing" ? 2000 : false) });
  const filesQ = useQuery({ queryKey: ["batch-files", batchId], enabled: !!batchId, queryFn: () => api.get(`/batches/${batchId}/files`),
    refetchInterval: () => (batch.data?.status === "processing" ? 2000 : false) });

  const status = batch.data?.status;
  useEffect(() => {
    if (status && status !== "processing") {
      qc.invalidateQueries({ queryKey: ["batch-files", batchId] }); qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["analytics"] }); qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [status]);

  const add = (list: FileList | File[]) => {
    const ok = Array.from(list).filter((f) => /\.(pdf|docx)$/i.test(f.name));
    if (ok.length < Array.from(list).length) toast.warning("Only PDF and DOCX files were added");
    const next = [...files, ...ok];
    if (next.length > MAX) toast.error(`You can upload up to ${MAX} CVs per batch`);
    setFiles(next.slice(0, MAX));
  };
  const start = useMutation({
    mutationFn: () => { const fd = new FormData(); fd.append("job_id", jobId); files.forEach((f) => fd.append("files", f)); return api.upload("/batches", fd); },
    onSuccess: (b: any) => { setFiles([]); setSp({ batch: String(b.id) }); toast.success("Upload received. Processing started."); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const retry = useMutation({ mutationFn: () => api.post(`/batches/${batchId}/retry`, {}), onSuccess: () => { toast.success("Retrying failed files"); qc.invalidateQueries({ queryKey: ["batch", batchId] }); qc.invalidateQueries({ queryKey: ["batch-files", batchId] }); }, onError: (e: any) => toast.error(e.message) });

  if (jobs.isLoading) return <Loading />;
  if (jobs.error || !jobs.data?.items.length) return <div><PageHeader title="CV upload and processing" /><EmptyState title="Create a job first" text="CVs are scored against one job. Set up your company and a job, then come back." action={<Link to="/recruiter/jobs/new" className={btn("primary")}>Create job</Link>} /></div>;
  const b = batch.data;
  const retryable = filesQ.data?.items.some((f: any) => f.status === "failed" && f.retryable);

  return (
    <div className="space-y-6">
      <PageHeader title="CV upload and processing" text={`Upload up to ${MAX} PDF or DOCX files. Each file is processed and scored on its own.`} />
      <Card className="space-y-4">
        <Field label="Target job"><Select value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Select the job to score against</option>{jobs.data.items.map((j: any) => <option key={j.id} value={j.id}>{j.title}{j.status !== "published" ? ` (${j.status})` : ""}</option>)}</Select></Field>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
          className={`flex cursor-pointer flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${drag ? "border-brand bg-brand/10" : "border-line hover:bg-white/[0.03]"}`}>
          <CloudUpload className="h-8 w-8 text-brand" /><p className="mt-3 text-sm font-medium">Drag CVs here, or click to choose files</p><p className="text-xs text-muted">PDF or DOCX, up to 5 MB each, {MAX} files per batch</p>
          <input ref={input} type="file" multiple hidden accept=".pdf,.docx" onChange={(e) => { e.target.files && add(e.target.files); e.target.value = ""; }} />
        </div>
        {!!files.length && (<div className="space-y-2"><div className="flex items-center justify-between text-sm"><span>{files.length} file{files.length > 1 && "s"} selected</span><button className="text-xs text-muted hover:text-ink" onClick={() => setFiles([])}>Clear</button></div>
          <ul className="max-h-40 space-y-1 overflow-auto rounded-xl border border-line bg-surface p-2 text-xs">{files.map((f, i) => <li key={i} className="flex justify-between px-2 py-1"><span className="truncate">{f.name}</span><span className="text-muted">{fmtSize(f.size)}</span></li>)}</ul></div>)}
        <Button disabled={!jobId || !files.length} loading={start.isPending} onClick={() => start.mutate()}>Upload and score {files.length || ""} CV{files.length === 1 ? "" : "s"}</Button>
      </Card>

      {b && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-medium">Batch #{b.id} · {b.job_title}</h2><p className="text-xs text-muted">{b.finished} of {b.total} files finished · {b.counts.completed} completed · {b.counts.failed} failed · {b.counts.duplicate} duplicates</p></div>
            <div className="flex gap-2">{retryable && <Button size="sm" variant="outline" loading={retry.isPending} onClick={() => retry.mutate()}><RefreshCw className="h-3.5 w-3.5" />Retry failed</Button>}
              {b.status !== "processing" && <Link to={`/recruiter/rankings/${b.job_id}`} className={btn("primary", "sm")}>View ranking</Link>}</div></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${b.total ? (b.finished / b.total) * 100 : 0}%` }} /></div>
          <Table><thead><tr><Th>File</Th><Th>Size</Th><Th>Status</Th><Th>Score</Th><Th>Details</Th></tr></thead><tbody>
            {filesQ.data?.items.map((f: any) => (
              <tr key={f.id}><Td className="max-w-[240px] truncate font-medium">{f.filename}</Td><Td className="text-muted">{fmtSize(f.size)}</Td><Td><StatusBadge kind="proc" status={f.status} /></Td>
                <Td>{f.match_id ? <Link to={`/recruiter/matches/${f.match_id}`}><ScoreNumber score={f.score} /></Link> : <span className="text-muted">–</span>}</Td>
                <Td className="max-w-xs text-xs text-muted">{f.error || (f.status === "completed" ? "Scored" : "")}</Td></tr>))}
          </tbody></Table>
        </Card>)}

      {!!batches.data?.items.length && (
        <div><h2 className="mb-3 font-medium">Recent batches</h2>
          <div className="grid gap-3 md:grid-cols-2">{batches.data.items.map((x: any) => (
            <button key={x.id} onClick={() => setSp({ batch: String(x.id) })} className={`rounded-2xl border p-4 text-left transition hover:bg-white/[0.04] ${String(x.id) === batchId ? "border-brand/50" : "border-line"}`}>
              <div className="flex justify-between"><b className="text-sm">#{x.id} · {x.job_title}</b><StatusBadge kind="proc" status={x.status === "processing" ? "processing" : x.status} /></div>
              <p className="mt-1 text-xs text-muted">{x.total} files · {fmtDateTime(x.created_at)}</p></button>))}</div></div>)}
    </div>);
}
