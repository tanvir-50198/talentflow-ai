import { BarChart3, Briefcase, Building2, FilePlus2, LayoutDashboard, ListChecks, PlusSquare, Settings, Trophy } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";

const nav = [
  { to: "/recruiter", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/recruiter/company", label: "Company Profile", icon: Building2 },
  { to: "/recruiter/jobs", label: "Job Management", icon: Briefcase, end: true },
  { to: "/recruiter/jobs/new", label: "Create Job", icon: PlusSquare },
  { to: "/recruiter/upload", label: "CV Upload & Processing", icon: FilePlus2 },
  { to: "/recruiter/rankings", label: "Candidate Rankings", icon: Trophy },
  { to: "/recruiter/applications", label: "Applications", icon: ListChecks },
  { to: "/recruiter/analytics", label: "Recruitment Analytics", icon: BarChart3 },
  { to: "/recruiter/settings", label: "Settings", icon: Settings },
];
export default function RecruiterLayout() { return <DashboardShell nav={nav} base="/recruiter" />; }
