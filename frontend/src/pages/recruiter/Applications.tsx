import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ScoreNumber } from "@/components/matching/Score";
import { EmptyState, ErrorState, Loading, PageHeader, Select, Table, Td, Th, btn } from "@/components/ui";
import { api } from "@/lib/api";
import { APP_STATUS } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export default function RecruiterApplications() {
  const [job, setJob] = useState("");
  const [status, setStatus] = useState("");
  const jobs = useQuery({ queryKey: ["manage-jobs"], queryFn: () => api.get("/jobs/manage/list"), retry: false });
  const { data, isLoading, error } = useQuery({ queryKey: ["rec-apps", job, status], queryFn: () => api.get("/applications", { job_id: job, status }) });
  return (
    <div>
      <PageHeader title="Applications" text="Everyone who applied to your jobs. Open a candidate to review evidence, change status and add notes." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="max-w-xs" value={job} onChange={(e) => setJob(e.target.value)}><option value="">All jobs</option>{jobs.data?.items.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select>
        <Select className="max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
      </div>
      {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : !data.items.length ? <EmptyState title="No applications yet" text="Publish a job and candidates can apply with their CVs." /> : (
        <Table><thead><tr><Th>Candidate</Th><Th>Job</Th><Th>Applied</Th><Th>Score</Th><Th>Status</Th><Th /></tr></thead><tbody>
          {data.items.map((a: any) => (
            <tr key={a.id}><Td><div className="flex items-center gap-3"><Avatar url={a.candidate.avatar_url} name={a.candidate.name} size={34} /><div><b className="block font-medium">{a.candidate.name}</b><span className="text-xs text-muted">{a.candidate.email}</span></div></div></Td>
              <Td>{a.job.title}</Td><Td className="text-muted">{fmtDate(a.created_at)}</Td><Td><ScoreNumber score={a.score} /></Td><Td><StatusBadge status={a.status} />{a.interview && <span className="mt-1 block text-xs text-muted">Interview {fmtDateTime(a.interview.scheduled_at)}</span>}</Td>
              <Td>{a.match_id && <Link to={`/recruiter/matches/${a.match_id}`} className={btn("outline", "sm")}>Review</Link>}</Td></tr>))}
        </tbody></Table>)}
    </div>);
}
