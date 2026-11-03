import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button, EmptyState, ErrorState, Loading, PageHeader, Table, Td, Th, btn } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";

export default function JobManagement() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["manage-jobs"], queryFn: () => api.get("/jobs/manage/list"), retry: false });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["manage-jobs"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); };
  const status = useMutation({ mutationFn: ({ id, s }: any) => api.patch(`/jobs/${id}/status`, { status: s }), onSuccess: () => { toast.success("Job updated"); refresh(); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: number) => api.del(`/jobs/${id}`), onSuccess: () => { toast.success("Job deleted"); refresh(); }, onError: (e: any) => toast.error(e.message) });
  if (isLoading) return <Loading />;
  if (error) return <div className="space-y-4"><ErrorState error={error} /><Link to="/recruiter/company" className={btn("outline")}>Go to company profile</Link></div>;
  return (
    <div>
      <PageHeader title="Job management" text="Publish, close and review the jobs you hire for." actions={<Link to="/recruiter/jobs/new" className={btn("primary")}>Create job</Link>} />
      {!data.items.length ? <EmptyState title="No jobs yet" text="Create a job with its required skills, then upload CVs to rank against it." action={<Link to="/recruiter/jobs/new" className={btn("primary")}>Create your first job</Link>} /> : (
        <Table><thead><tr><Th>Job</Th><Th>Status</Th><Th>Applications</Th><Th>Screened CVs</Th><Th>Deadline</Th><Th className="text-right">Actions</Th></tr></thead><tbody>
          {data.items.map((j: any) => (
            <tr key={j.id}><Td><Link to={`/jobs/${j.id}`} className="font-medium hover:text-brand">{j.title}</Link><p className="text-xs text-muted">{j.location} · {j.employment_type}</p></Td>
              <Td><StatusBadge kind="job" status={j.status} /></Td><Td>{j.applications}</Td><Td>{j.cvs}</Td><Td className="text-muted">{fmtDate(j.deadline)}</Td>
              <Td><div className="flex flex-wrap justify-end gap-1.5">
                <Link to={`/recruiter/rankings/${j.id}`} className={btn("outline", "sm")}>Rankings</Link>
                <Link to={`/recruiter/jobs/${j.id}/edit`} className={btn("ghost", "sm")}>Edit</Link>
                {j.status !== "published" ? <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: j.id, s: "published" })}>Publish</Button> : <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: j.id, s: "draft" })}>Unpublish</Button>}
                {j.status !== "closed" && <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: j.id, s: "closed" })}>Close</Button>}
                <Button size="sm" variant="danger" onClick={() => confirm(`Delete “${j.title}”?`) && del.mutate(j.id)}>Delete</Button></div></Td></tr>))}
        </tbody></Table>)}
    </div>);
}
