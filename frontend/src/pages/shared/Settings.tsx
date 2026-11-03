import { useState } from "react";
import { toast } from "sonner";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function Settings() {
  const { user, reload } = useAuth();
  const [p, setP] = useState({ full_name: user?.full_name || "", phone: user?.phone || "", job_title: user?.job_title || "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [busy, setBusy] = useState("");
  const run = async (key: string, fn: () => Promise<any>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); } catch (e: any) { toast.error(e.message); } finally { setBusy(""); }
  };
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" text={user?.role === "recruiter" ? "Manage your recruiter profile and account." : "Manage your account."} />
      {user?.role === "recruiter" && (
        <Card className="space-y-5"><h2 className="font-medium">Recruiter profile</h2><AvatarUploader />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></Field>
            <Field label="Job title"><Input value={p.job_title} onChange={(e) => setP({ ...p, job_title: e.target.value })} placeholder="Talent Lead" /></Field>
            <Field label="Phone"><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={user.email} disabled /></Field></div>
          <Button loading={busy === "p"} onClick={() => run("p", async () => { await api.put("/profiles/me", p); await reload(); }, "Profile saved")}>Save profile</Button></Card>)}
      <Card className="space-y-4"><h2 className="font-medium">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field></div>
        <Button loading={busy === "pw"} disabled={pw.new_password.length < 8} onClick={() => run("pw", async () => { await api.post("/profiles/me/password", pw); setPw({ current_password: "", new_password: "" }); }, "Password updated")}>Update password</Button></Card>
    </div>);
}
