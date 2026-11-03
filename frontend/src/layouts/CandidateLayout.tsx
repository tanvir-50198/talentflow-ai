import { Bell, Briefcase, FileText, LayoutDashboard, Search, Settings, User } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";

const nav = [
  { to: "/candidate", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/candidate/profile", label: "My Profile", icon: User },
  { to: "/candidate/cvs", label: "My CVs", icon: FileText },
  { to: "/candidate/jobs", label: "Browse Jobs", icon: Search },
  { to: "/candidate/applications", label: "My Applications", icon: Briefcase },
  { to: "/candidate/notifications", label: "Notifications", icon: Bell },
  { to: "/candidate/settings", label: "Settings", icon: Settings },
];
export default function CandidateLayout() { return <DashboardShell nav={nav} base="/candidate" />; }
