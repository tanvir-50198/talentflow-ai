import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  return (
    <Card className="mx-auto mt-10 max-w-md p-8">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">Enter your account email and we will send a reset link.</p>
      {res ? (
        <div className="mt-6 space-y-3 text-sm"><p className="text-emerald-300">{res.message}</p>
          {res.dev_reset_token && <p className="rounded-xl border border-line bg-surface p-3 text-xs text-muted">Development mode (no email service in v1): <Link className="text-brand underline" to={`/reset-password?token=${res.dev_reset_token}`}>open the reset page</Link></p>}</div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { setRes(await api.post("/auth/forgot-password", { email })); } catch (er: any) { toast.error(er.message); } finally { setBusy(false); } }}>
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button className="w-full" loading={busy}>Send reset link</Button>
        </form>)}
      <p className="mt-5 text-center text-sm"><Link to="/login" className="text-brand hover:underline">Back to log in</Link></p>
    </Card>);
}
