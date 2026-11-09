import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Calendar, Globe, MapPin } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CompanyLogo } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge, Button, Card, ErrorState, Loading, Select, btn } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";

function ApplyBox({ jobId }: { jobId: number }) {
  const qc = useQueryClient();
  const [cv, setCv] = useState("");
  const cvs = useQuery({ queryKey: ["cvs"], queryFn: () => api.get("/cvs") });
  const apps = useQuery({ queryKey: ["my-apps"], queryFn: () => api.get("/applications/me") });
  const existing = apps.data?.items.find((a: any) => a.job.id === jobId);
  const ok = (cvs.data?.items || []).filter((c: any) => c.status === "completed");
  const chosen = cv || String(ok.find((c: any) => c.is_default)?.id || ok[0]?.id || "");
  const apply = useMutation({
    mutationFn: () => api.post(`/jobs/${jobId}/apply`, { cv_id: Number(chosen) }),
    onSuccess: () => { toast.success("Application submitted"); qc.invalidateQueries({ queryKey: ["my-apps"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (existing && existing.status !== "withdrawn") return <Card><h3 className="font-medium">Your application</h3><div className="mt-2 flex items-center gap-2 text-sm text-muted">Status <StatusBadge status={existing.status} /></div><Link to="/candidate/applications" className="mt-3 inline-block text-sm text-brand hover:underline">Track your applications</Link></Card>;
  return (
    <Card className="space-y-3">
      <h3 className="font-medium">Apply for this job</h3>
      {!ok.length ? <p className="text-sm text-muted">You need a processed CV to apply. <Link to="/candidate/cvs" className="text-brand hover:underline">Upload a CV</Link></p> : (<>
        <label className="block text-xs text-muted">Choose a CV<Select className="mt-1.5" value={chosen} onChange={(e) => setCv(e.target.value)}>{ok.map((c: any) => <option key={c.id} value={c.id}>{c.filename}{c.is_default ? " (default)" : ""}</option>)}</Select></label>
        <Button className="w-full" loading={apply.isPending} onClick={() => apply.mutate()}>Submit application</Button></>)}
    </Card>);
}

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: job, isLoading, error } = useQuery({ queryKey: ["job", id], queryFn: () => api.get(`/jobs/${id}`) });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const edu = ({ none: "", diploma: "Diploma", bachelor: "Bachelor's degree", master: "Master's degree", phd: "PhD" } as any)[job.education_requirement];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <div className="flex items-start gap-4"><CompanyLogo url={job.company.logo_url} name={job.company.name} size={56} />
            <div><h1 className="text-2xl font-semibold">{job.title}</h1><p className="text-muted">{job.company.name}</p></div></div>
          <div className="mt-4 flex flex-wrap gap-2"><Badge tone="green" className="capitalize">{job.employment_type}</Badge><Badge className="capitalize">{job.experience_level}</Badge><Badge className="capitalize">{job.work_arrangement}</Badge>{job.status !== "published" && <StatusBadge kind="job" status={job.status} />}</div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {job.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>}
            <span>Posted {fmtDate(job.created_at)}</span>{job.deadline && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Apply by {fmtDate(job.deadline)}</span>}
          </div>
        </Card>
        <Card><h2 className="mb-2 font-medium">About the role</h2><p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{job.description}</p></Card>
        <Card className="space-y-4"><h2 className="font-medium">Requirements</h2>
          <div className="text-sm text-muted">{job.min_experience > 0 ? `${job.min_experience}+ years of experience` : "No minimum experience"}{edu && ` · ${edu}`}</div>
          {!!job.required_skills.length && <div><p className="mb-2 text-xs text-muted">Required skills</p><div className="flex flex-wrap gap-1.5">{job.required_skills.map((s: string) => <Badge key={s} tone="green">{s}</Badge>)}</div></div>}
          {!!job.preferred_skills.length && <div><p className="mb-2 text-xs text-muted">Preferred skills</p><div className="flex flex-wrap gap-1.5">{job.preferred_skills.map((s: string) => <Badge key={s}>{s}</Badge>)}</div></div>}
        </Card>
      </div>
      <div className="space-y-4">
        {user?.role === "candidate" && <ApplyBox jobId={job.id} />}
        {!user && <Card><h3 className="font-medium">Interested?</h3><p className="mt-1 text-sm text-muted">Log in or create a candidate account to apply.</p><div className="mt-3 flex gap-2"><Link to="/login" className={btn("outline", "md", "flex-1")}>Log in</Link><Link to="/register" className={btn("primary", "md", "flex-1")}>Sign up</Link></div></Card>}
        {user?.role === "recruiter" && <Card className="text-sm text-muted">Recruiters can’t apply for jobs. Use a candidate account to apply.</Card>}
        <Card className="space-y-2 text-sm"><h3 className="font-medium">{job.company.name}</h3>
          {job.company.industry && <p className="flex items-center gap-2 text-muted"><Building2 className="h-4 w-4" />{job.company.industry}{job.company.size && ` · ${job.company.size} people`}</p>}
          {job.company.website && <p className="flex items-center gap-2 text-muted"><Globe className="h-4 w-4" /><a href={job.company.website} target="_blank" rel="noreferrer" className="text-brand hover:underline">{job.company.website}</a></p>}</Card>
      </div>
    </div>);
}
