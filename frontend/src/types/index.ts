export type Role = "candidate" | "recruiter";
export interface User {
  id: number; email: string; full_name: string; role: Role; avatar_url: string | null;
  phone?: string; headline?: string; location?: string; summary?: string; skills?: string[];
  education?: string; experience?: string; linkedin?: string; github?: string; portfolio?: string; job_title?: string;
}
export interface Job {
  id: number; title: string; description?: string; location?: string; employment_type: string; experience_level: string;
  work_arrangement: string; min_experience: number; education_requirement: string; deadline?: string | null; status: string;
  created_at: string; required_skills: string[]; preferred_skills: string[]; weights?: Record<string, number> | null;
  applications?: number; cvs?: number;
  company: { id: number; name: string; logo_url?: string | null; location?: string; industry?: string; website?: string; size?: string };
}
export interface Company {
  id: number; name: string; description?: string; industry?: string; website?: string; location?: string; size?: string;
  contact_email?: string; contact_phone?: string; logo_url?: string | null;
}
export interface CV {
  id: number; filename: string; status: string; error?: string | null; is_default: boolean; size: number; created_at: string;
  candidate_name?: string; duplicate_of_id?: number | null; retryable?: boolean; match_id?: number | null; score?: number | null;
}
