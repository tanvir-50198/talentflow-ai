import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

export default function Reset() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mx-auto mt-10 max-w-md p-8">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <form className="mt-6 space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { await api.post("/auth/reset-password", { token: sp.get("token") || "", new_password: pw }); toast.success("Password updated"); nav("/login"); }
        catch (er: any) { toast.error(er.message); } finally { setBusy(false); }
      }}>
        <Field label="New password" hint="At least 8 characters"><Input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Button className="w-full" loading={busy}>Update password</Button>
      </form>
      <p className="mt-5 text-center text-sm"><Link to="/login" className="text-brand hover:underline">Back to log in</Link></p>
    </Card>);
}
