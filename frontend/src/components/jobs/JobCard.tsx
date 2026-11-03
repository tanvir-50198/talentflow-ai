import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { CompanyLogo } from "@/components/common/Avatar";
import { Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { Job } from "@/types";

export function JobCard({ job, to }: { job: Job; to: string }) {
  return (
    <Link to={to} className="group block rounded-2xl border border-line bg-card/70 p-5 transition hover:border-brand/40 hover:bg-card">
      <div className="flex items-start gap-3">
        <CompanyLogo url={job.company.logo_url} name={job.company.name} size={44} />
        <div className="min-w-0 flex-1"><h3 className="truncate font-medium group-hover:text-brand">{job.title}</h3><p className="truncate text-sm text-muted">{job.company.name}</p></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge tone="green" className="capitalize">{job.employment_type}</Badge><Badge className="capitalize">{job.experience_level}</Badge><Badge className="capitalize">{job.work_arrangement}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
        <span>Posted {fmtDate(job.created_at)}</span>
        {job.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Apply by {fmtDate(job.deadline)}</span>}
      </div>
    </Link>);
}
