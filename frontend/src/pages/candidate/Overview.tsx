import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/common/StatusBadge";
import { JobCard } from "@/components/jobs/JobCard";
import { Card, EmptyState, ErrorState, Loading, PageHeader, btn } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";

export const Stat = ({ label, value, hint }: { label: string; value: any; hint?: string }) => (
  <Card className="p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</Card>);

export default function CandidateOverview() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["analytics", "candidate"], queryFn: () => api.get("/analytics/candidate") });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <div className="space-y-8">
      <PageHeader title={`Hello, ${user?.full_name.split(" ")[0]}`} text="Here is where your job search stands." actions={<Link to="/candidate/jobs" className={btn("primary")}>Browse jobs</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Profile completion</p><p className="mt-1 text-3xl font-semibold">{data.profile_completion}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${data.profile_completion}%` }} /></div>
          {data.profile_completion < 100 && <Link to="/candidate/profile" className="mt-2 inline-block text-xs text-brand hover:underline">Complete your profile</Link>}</Card>
        <Stat label="Total applications" value={data.total} /><Stat label="Pending" value={data.pending} hint="Applied or under review" /><Stat label="Shortlisted" value={data.shortlisted} />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2"><h2 className="mb-3 font-medium">Recent activity</h2>
          {!data.recent.length ? <p className="text-sm text-muted">No activity yet. Apply to a job to get started.</p> : (
            <ul className="space-y-3">{data.recent.map((r: any, i: number) => <li key={i} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate">{r.job_title}</span><span className="flex items-center gap-2"><StatusBadge status={r.status} /><span className="text-xs text-muted">{fmtDate(r.at)}</span></span></li>)}</ul>)}</Card>
        <div className="lg:col-span-3"><h2 className="mb-3 font-medium">Recommended for you</h2>
          {!data.recommended.length ? <EmptyState title="No recommendations yet" text="Add skills to your profile or upload a CV and matching jobs will appear here." /> :
            <div className="grid gap-3 md:grid-cols-2">{data.recommended.slice(0, 4).map((j: any) => <JobCard key={j.id} job={j} to={`/candidate/jobs/${j.id}`} />)}</div>}</div>
      </div>
    </div>);
}
