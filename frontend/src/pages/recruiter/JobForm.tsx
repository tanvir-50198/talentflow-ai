import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, Card, ErrorState, Field, Input, Loading, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { EDUCATION_LEVELS, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, WORK_ARRANGEMENTS } from "@/lib/constants";
import { splitList } from "@/lib/utils";
import { jobSchema } from "@/schemas";

const W = [["required_skills", "Required skills"], ["experience", "Relevant experience"], ["education", "Education"], ["preferred_skills", "Preferred skills"], ["keywords", "Relevant keywords"]];
const defaults: any = { title: "", description: "", location: "", employment_type: "full-time", experience_level: "mid", work_arrangement: "onsite", min_experience: 0,
  education_requirement: "none", deadline: "", required_skills: "", preferred_skills: "", w_required_skills: 40, w_experience: 25, w_education: 15, w_preferred_skills: 10, w_keywords: 10 };

export default function JobForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: job, isLoading, error } = useQuery({ queryKey: ["job", id], queryFn: () => api.get(`/jobs/${id}`), enabled: !!id });
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({ resolver: zodResolver(jobSchema), defaultValues: defaults });
  useEffect(() => {
    if (!job) return;
    const w = job.weights || {};
    reset({ ...defaults, ...job, location: job.location || "", deadline: job.deadline || "", required_skills: job.required_skills.join(", "), preferred_skills: job.preferred_skills.join(", "),
      ...Object.fromEntries(W.map(([k]) => ["w_" + k, w[k] ?? defaults["w_" + k]])) });
  }, [job]);
  const total = W.reduce((s, [k]) => s + (Number(watch("w_" + k)) || 0), 0);

  const submit = (status: string) => handleSubmit(async (d: any) => {
    const body = { title: d.title, description: d.description, location: d.location || null, employment_type: d.employment_type, experience_level: d.experience_level,
      work_arrangement: d.work_arrangement, min_experience: d.min_experience, education_requirement: d.education_requirement, deadline: d.deadline || null,
      required_skills: splitList(d.required_skills || ""), preferred_skills: splitList(d.preferred_skills || ""), status,
      weights: Object.fromEntries(W.map(([k]) => [k, Number(d["w_" + k])])) };
    try {
      id ? await api.put(`/jobs/${id}`, body) : await api.post("/jobs", body);
      toast.success(status === "published" ? "Job published" : "Job saved");
      qc.invalidateQueries({ queryKey: ["manage-jobs"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); qc.invalidateQueries({ queryKey: ["job"] });
      nav("/recruiter/jobs");
    } catch (e: any) { toast.error(e.message); }
  });
  if (id && isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <form className="max-w-3xl space-y-6" onSubmit={(e) => e.preventDefault()}>
      <PageHeader title={id ? "Edit job" : "Create job"} text="Saving requirement changes re-scores every CV already screened for this job." />
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" error={errors.title?.message as string} className="sm:col-span-2"><Input {...register("title")} /></Field>
        <Field label="Description" error={errors.description?.message as string} className="sm:col-span-2"><Textarea rows={6} {...register("description")} /></Field>
        <Field label="Location"><Input {...register("location")} /></Field>
        <Field label="Application deadline"><Input type="date" {...register("deadline")} /></Field>
        <Field label="Employment type"><Select {...register("employment_type")}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Experience level"><Select {...register("experience_level")}>{EXPERIENCE_LEVELS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Work arrangement"><Select {...register("work_arrangement")}>{WORK_ARRANGEMENTS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Minimum experience (years)"><Input type="number" step="0.5" min="0" {...register("min_experience")} /></Field>
        <Field label="Education requirement" className="sm:col-span-2"><Select {...register("education_requirement")}>{EDUCATION_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
      </Card>
      <Card className="space-y-4"><h2 className="font-medium">Skills</h2>
        <Field label="Required skills" hint="Separate with commas. Aliases are normalised, so “React.js” and “ReactJS” both become React."><Input placeholder="Python, FastAPI, PostgreSQL" {...register("required_skills")} /></Field>
        <Field label="Preferred skills"><Input placeholder="Docker, AWS" {...register("preferred_skills")} /></Field></Card>
      <Card className="space-y-4"><div className="flex items-baseline justify-between"><h2 className="font-medium">Scoring weights</h2><span className={total === 100 ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>Total {total} / 100</span></div>
        <p className="text-sm text-muted">Initial defaults. Validate them against reviewed sample CVs before relying on them.</p>
        <div className="grid gap-3 sm:grid-cols-5">{W.map(([k, l]) => <Field key={k} label={l}><Input type="number" min="0" {...register("w_" + k)} /></Field>)}</div>
        {errors.w_required_skills && <p className="text-xs text-rose-400">{errors.w_required_skills.message as string}</p>}</Card>
      <div className="flex gap-3"><Button variant="outline" loading={isSubmitting} onClick={submit(job ? job.status : "draft")}>{id ? "Save changes" : "Save as draft"}</Button>
        {job?.status !== "published" && <Button loading={isSubmitting} onClick={submit("published")}>{id ? "Save and publish" : "Publish job"}</Button>}</div>
    </form>);
}
