import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, EmptyState, ErrorState, Loading, PageHeader, btn } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";
import { Stat } from "@/pages/candidate/Overview";

export default function RecruiterOverview() {
  const { data, isLoading, error } = useQuery({ queryKey: ["analytics", "recruiter"], queryFn: () => api.get("/analytics/recruiter") });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data.has_company) return (
    <div><PageHeader title="Welcome to TalentFlow AI" text="Set up your company to start posting jobs and ranking CVs." />
      <EmptyState title="Create your company profile" text="Jobs, CV batches and rankings are organised under your company." action={<Link to="/recruiter/company" className={btn("primary")}>Create company profile</Link>} /></div>);
  return (
    <div className="space-y-8">
      <PageHeader title="Recruitment overview" text="Live numbers from your jobs, CV batches and applications." actions={<>
        <Link to="/recruiter/jobs/new" className={btn("outline")}>Create job</Link><Link to="/recruiter/upload" className={btn("primary")}>Upload CVs</Link></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Active jobs" value={data.active_jobs} hint={`${data.total_jobs} total`} /><Stat label="Applications" value={data.applications} />
        <Stat label="Processed CVs" value={data.processed_cvs} hint={`${data.failed_cvs} failed · ${data.duplicate_cvs} duplicates`} />
        <Stat label="Awaiting review" value={data.awaiting_review} hint="Newly applied candidates" /><Stat label="Shortlisted" value={data.shortlisted} /><Stat label="Total uploaded CVs" value={data.total_cvs} />
      </div>
      <Card><h2 className="mb-3 font-medium">Recent activity</h2>
        {!data.recent.length ? <p className="text-sm text-muted">Nothing yet. Upload a batch of CVs or publish a job.</p> :
          <ul className="divide-y divide-line">{data.recent.map((r: any, i: number) => <li key={i} className="flex justify-between gap-4 py-2.5 text-sm"><span>{r.text}</span><span className="shrink-0 text-xs text-muted">{fmtDateTime(r.at)}</span></li>)}</ul>}</Card>
    </div>);
}
