import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email("Enter a valid email address"), password: z.string().min(1, "Enter your password") });
export const registerSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"), email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"), role: z.enum(["candidate", "recruiter"]),
});
export const jobSchema = z.object({
  title: z.string().min(2, "Enter a job title"), description: z.string().min(10, "Describe the role in at least 10 characters"),
  location: z.string().optional(), employment_type: z.string(), experience_level: z.string(), work_arrangement: z.string(),
  min_experience: z.coerce.number().min(0).max(40), education_requirement: z.string(), deadline: z.string().optional(),
  required_skills: z.string().optional(), preferred_skills: z.string().optional(),
  w_required_skills: z.coerce.number().min(0), w_experience: z.coerce.number().min(0), w_education: z.coerce.number().min(0),
  w_preferred_skills: z.coerce.number().min(0), w_keywords: z.coerce.number().min(0),
}).refine((d) => Math.round(d.w_required_skills + d.w_experience + d.w_education + d.w_preferred_skills + d.w_keywords) === 100,
  { message: "Weights must add up to 100", path: ["w_required_skills"] });
