import { useState } from "react";
import { toast } from "sonner";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { splitList } from "@/lib/utils";

export default function CandidateProfile() {
  const { user, reload } = useAuth();
  const [f, setF] = useState({
    full_name: user?.full_name || "", phone: user?.phone || "", headline: user?.headline || "", location: user?.location || "",
    summary: user?.summary || "", skills: (user?.skills || []).join(", "), education: user?.education || "", experience: user?.experience || "",
    linkedin: user?.linkedin || "", github: user?.github || "", portfolio: user?.portfolio || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try { await api.put("/profiles/me", { ...f, skills: splitList(f.skills) }); await reload(); toast.success("Profile saved"); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="My profile" text="Recruiters see this information when you apply." />
      <Card><AvatarUploader /></Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.full_name} onChange={set("full_name")} /></Field>
        <Field label="Email"><Input value={user?.email} disabled /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Location"><Input value={f.location} onChange={set("location")} /></Field>
        <Field label="Professional headline" className="sm:col-span-2"><Input value={f.headline} onChange={set("headline")} placeholder="Backend developer with 4 years of experience" /></Field>
        <Field label="Professional summary" className="sm:col-span-2"><Textarea value={f.summary} onChange={set("summary")} /></Field>
        <Field label="Skills" hint="Separate with commas" className="sm:col-span-2"><Input value={f.skills} onChange={set("skills")} placeholder="Python, FastAPI, PostgreSQL" /></Field>
        <Field label="Education" className="sm:col-span-2"><Textarea value={f.education} onChange={set("education")} /></Field>
        <Field label="Work experience" className="sm:col-span-2"><Textarea value={f.experience} onChange={set("experience")} /></Field>
        <Field label="LinkedIn URL"><Input value={f.linkedin} onChange={set("linkedin")} /></Field>
        <Field label="GitHub URL"><Input value={f.github} onChange={set("github")} /></Field>
        <Field label="Portfolio URL" className="sm:col-span-2"><Input value={f.portfolio} onChange={set("portfolio")} /></Field>
      </Card>
      <Button loading={busy} onClick={save}>Save profile</Button>
    </div>);
}
