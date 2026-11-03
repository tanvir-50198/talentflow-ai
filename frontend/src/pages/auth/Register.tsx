import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthField, AuthInput, AuthShell, PasswordInput, authButton } from "@/components/auth/AuthShell";
import { homeFor, useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { registerSchema } from "@/schemas";

export default function Register() {
  const { register: signUp } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>({ resolver: zodResolver(registerSchema), defaultValues: { role: "candidate" } });
  const role = watch("role");
  return (
    <AuthShell title="Create your account" subtitle="Choose what you want to do on TalentFlow AI.">
      <form className="mt-7 space-y-4" onSubmit={handleSubmit(async (d) => {
        try { nav(homeFor(await signUp(d)), { replace: true }); } catch (e: any) { toast.error(e.message); }
      })}>
        <div role="group" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-lg bg-[#0f1512] p-1">
          {([["candidate", "I am looking for a job"], ["recruiter", "I am hiring"]] as const).map(([v, t]) => (
            <button type="button" key={v} onClick={() => setValue("role", v)} aria-pressed={role === v}
              className={cn("h-8 rounded-md text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", role === v ? "bg-[#1d2a24] text-ink" : "text-muted hover:text-ink")}>{t}</button>))}
        </div>
        <AuthField label="Full name" error={errors.full_name?.message}><AuthInput autoComplete="name" {...register("full_name")} /></AuthField>
        <AuthField label="Email" error={errors.email?.message}><AuthInput type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} /></AuthField>
        <AuthField label="Password" hint="At least 8 characters." error={errors.password?.message}><PasswordInput autoComplete="new-password" {...register("password")} /></AuthField>
        <button className={authButton} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Create account</button>
      </form>
      <p className="mt-5 text-xs text-muted">Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
    </AuthShell>);
}
