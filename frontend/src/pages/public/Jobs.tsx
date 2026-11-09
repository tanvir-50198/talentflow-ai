import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState, ErrorState, Input, Loading, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import type { Job } from "@/types";

export default function Jobs({ base }: { base: string }) {
  const [f, setF] = useState({ q: "", location: "", employment_type: "", experience_level: "", skill: "", company: "" });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const { data, isLoading, error } = useQuery({ queryKey: ["jobs", f], queryFn: () => api.get("/jobs", f), placeholderData: keepPreviousData });
  return (
    <div>
      <PageHeader title="Browse jobs" text="Open positions from companies hiring on TalentFlow AI." />
      <div className="mb-6 grid gap-3 rounded-2xl border border-line bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><Input className="pl-9" placeholder="Search by job title" value={f.q} onChange={set("q")} /></div>
        <Input placeholder="Location" value={f.location} onChange={set("location")} />
        <Select value={f.employment_type} onChange={set("employment_type")}><option value="">Any employment type</option>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</Select>
        <Select value={f.experience_level} onChange={set("experience_level")}><option value="">Any experience level</option>{EXPERIENCE_LEVELS.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
        <Input placeholder="Required skill, e.g. Python" value={f.skill} onChange={set("skill")} />
        <Input placeholder="Company" value={f.company} onChange={set("company")} />
      </div>
      {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : !data?.items.length ? (
        <EmptyState title="No jobs match these filters" text="Try removing a filter or searching a broader title." />
      ) : (<>
        <p className="mb-3 text-sm text-muted">{data.total} open {data.total === 1 ? "job" : "jobs"}, newest first</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.items.map((j: Job) => <JobCard key={j.id} job={j} to={`${base}/${j.id}`} />)}</div></>)}
    </div>);
}
