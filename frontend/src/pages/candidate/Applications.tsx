import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { InterviewCard } from "@/components/applications/InterviewCard";
import { CompanyLogo } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button, EmptyState, ErrorState, Loading, PageHeader, Spinner, Table, Td, Th, btn } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/utils";

const WITHDRAWABLE = ["applied", "under_review", "shortlisted", "interview"];

function History({ id }: { id: number }) {
  const { data } = useQuery({ queryKey: ["app", id], queryFn: () => api.get(`/applications/${id}`) });
  if (!data) return <Spinner />;
  return <ol className="space-y-2 border-l border-line pl-4">{data.history.map((h: any, i: number) => (
    <li key={i} className="text-sm"><StatusBadge status={h.new_status} /> <span className="ml-2 text-xs text-muted">{fmtDateTime(h.created_at)}</span>
      {h.message && <p className="mt-1 whitespace-pre-line text-ink/90">“{h.message}” <span className="text-xs text-muted">— {h.changed_by}</span></p>}</li>))}</ol>;
}

export default function MyApplications() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-apps"], queryFn: () => api.get("/applications/me") });
  const withdraw = useMutation({
    mutationFn: (id: number) => api.patch(`/applications/${id}/withdraw`, {}),
    onSuccess: () => { toast.success("Application withdrawn"); qc.invalidateQueries({ queryKey: ["my-apps"] }); qc.invalidateQueries({ queryKey: ["app"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <div>
      <PageHeader title="My applications" text="Track every application and its status history." />
      {!data.items.length ? <EmptyState title="You haven’t applied yet" text="Find an open role and apply with one of your CVs." action={<Link to="/candidate/jobs" className={btn("primary")}>Browse jobs</Link>} /> : (
        <Table><thead><tr><Th>Job</Th><Th>Applied</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead><tbody>
          {data.items.map((a: any) => (<Fragment key={a.id}>
            <tr key={a.id}><Td><div className="flex items-center gap-3"><CompanyLogo url={a.job.company_logo} name={a.job.company} size={36} />
              <div><Link to={`/candidate/jobs/${a.job.id}`} className="font-medium hover:text-brand">{a.job.title}</Link><p className="text-xs text-muted">{a.job.company}</p></div></div></Td>
              <Td className="text-muted">{fmtDate(a.created_at)}</Td><Td><StatusBadge status={a.status} /></Td>
              <Td><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? "Hide history" : "History"}</Button>
                {WITHDRAWABLE.includes(a.status) && <Button size="sm" variant="danger" onClick={() => confirm("Withdraw this application?") && withdraw.mutate(a.id)}>Withdraw</Button>}</div></Td></tr>
            {(a.interview || a.last_message) && <tr key={a.id + "u"}><Td colSpan={4} className="space-y-3 bg-surface/40">
              {a.interview && <InterviewCard candidate interview={a.interview} title={`${a.job.title} at ${a.job.company}`} />}
              {a.last_message && <div className="rounded-xl border border-brand/25 bg-brand/5 p-4 text-sm"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-brand" /><b className="font-medium">Message from {a.job.company}</b><span className="text-xs text-muted">{fmtDateTime(a.last_message.created_at)}</span></div>
                <p className="mt-2 whitespace-pre-line">{a.last_message.text}</p></div>}</Td></tr>}
            {open === a.id && <tr key={a.id + "h"}><Td colSpan={4} className="bg-surface/60"><History id={a.id} /></Td></tr>}</Fragment>))}
        </tbody></Table>)}
    </div>);
}
