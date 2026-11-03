export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship", "freelance"];
export const EXPERIENCE_LEVELS = ["entry", "junior", "mid", "senior", "lead"];
export const WORK_ARRANGEMENTS = ["onsite", "hybrid", "remote"];
export const EDUCATION_LEVELS = [["none", "No requirement"], ["diploma", "Diploma"], ["bachelor", "Bachelor's"], ["master", "Master's"], ["phd", "PhD"]];
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
export const DISCLAIMER = "Scores are matching indicators for one job. They are not hiring recommendations or hiring probabilities.";

export type Tone = "green" | "amber" | "rose" | "sky" | "slate" | "violet";
export const APP_STATUS: Record<string, { label: string; tone: Tone }> = {
  applied: { label: "Applied", tone: "sky" }, under_review: { label: "Under review", tone: "amber" },
  shortlisted: { label: "Shortlisted", tone: "green" }, interview: { label: "Interview", tone: "violet" },
  offered: { label: "Offered", tone: "green" }, rejected: { label: "Rejected", tone: "rose" }, withdrawn: { label: "Withdrawn", tone: "slate" },
};
export const PROC_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "slate" }, processing: { label: "Processing", tone: "sky" },
  completed: { label: "Completed", tone: "green" }, failed: { label: "Failed", tone: "rose" }, duplicate: { label: "Duplicate", tone: "amber" },
};
export const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "slate" }, published: { label: "Published", tone: "green" }, closed: { label: "Closed", tone: "rose" },
};
export function band(score?: number | null): { label: string; tone: Tone; text: string } {
  if (score == null) return { label: "Not scored", tone: "slate", text: "text-muted" };
  if (score >= 90) return { label: "Strong", tone: "green", text: "text-emerald-300" };
  if (score >= 80) return { label: "Good", tone: "green", text: "text-teal-300" };
  if (score >= 60) return { label: "Review", tone: "amber", text: "text-amber-300" };
  return { label: "Low", tone: "rose", text: "text-rose-300" };
}
