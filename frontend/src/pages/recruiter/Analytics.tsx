import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, EmptyState, ErrorState, Loading, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { APP_STATUS, PROC_STATUS } from "@/lib/constants";
import { Stat } from "@/pages/candidate/Overview";

const COLORS = ["#34d399", "#38bdf8", "#f5b942", "#a78bfa", "#f87171", "#94a3b8", "#2dd4bf"];
const tip = { contentStyle: { background: "#0a1812", border: "1px solid #15382b", borderRadius: 12, fontSize: 12 } };

export default function Analytics() {
  const { data, isLoading, error } = useQuery({ queryKey: ["analytics", "recruiter"], queryFn: () => api.get("/analytics/recruiter") });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data.has_company) return <EmptyState title="No data yet" text="Create your company and publish a job to see analytics." />;
  const dist = data.status_distribution.map((d: any) => ({ name: APP_STATUS[d.status]?.label || d.status, value: d.count }));
  const cv = data.cv_status.map((d: any) => ({ name: PROC_STATUS[d.status]?.label || d.status, value: d.count }));
  return (
    <div className="space-y-6">
      <PageHeader title="Recruitment analytics" text="Calculated from your real records. Nothing here is estimated." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Total jobs" value={data.total_jobs} hint={`${data.active_jobs} active`} /><Stat label="Uploaded CVs" value={data.total_cvs} /><Stat label="Processed" value={data.processed_cvs} hint={`${data.failed_cvs} failed`} /><Stat label="Applications" value={data.applications} /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-medium">Candidate status distribution</h2>{!dist.length ? <p className="py-10 text-center text-sm text-muted">No applications yet.</p> : (
          <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={dist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{dist.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}</Pie><Tooltip {...tip} /><Legend /></PieChart></ResponsiveContainer>)}</Card>
        <Card><h2 className="mb-4 font-medium">CV processing outcomes</h2>{!cv.length ? <p className="py-10 text-center text-sm text-muted">No CV batches yet.</p> : (
          <ResponsiveContainer width="100%" height={260}><BarChart data={cv}><CartesianGrid stroke="#15382b" vertical={false} /><XAxis dataKey="name" stroke="#86a597" fontSize={12} /><YAxis allowDecimals={false} stroke="#86a597" fontSize={12} /><Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,.04)" }} /><Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>)}</Card>
        <Card className="lg:col-span-2"><h2 className="mb-4 font-medium">Volume per job</h2>{!data.per_job.length ? <p className="py-10 text-center text-sm text-muted">No jobs yet.</p> : (
          <ResponsiveContainer width="100%" height={280}><BarChart data={data.per_job}><CartesianGrid stroke="#15382b" vertical={false} /><XAxis dataKey="title" stroke="#86a597" fontSize={12} /><YAxis allowDecimals={false} stroke="#86a597" fontSize={12} /><Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,.04)" }} /><Legend />
            <Bar dataKey="applications" name="Applications" fill="#34d399" radius={[6, 6, 0, 0]} /><Bar dataKey="cvs" name="Screened CVs" fill="#38bdf8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>)}</Card>
      </div>
    </div>);
}
