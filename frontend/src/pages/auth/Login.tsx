import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthField, AuthInput, AuthShell, PasswordInput, authButton } from "@/components/auth/AuthShell";
import { homeFor, useAuth } from "@/context/AuthContext";
import { loginSchema } from "@/schemas";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({ resolver: zodResolver(loginSchema) });
  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to your dashboard.">
      <form className="mt-7 space-y-4" onSubmit={handleSubmit(async (d) => {
        try { nav(homeFor(await login(d.email, d.password)), { replace: true }); } catch (e: any) { toast.error(e.message); }
      })}>
        <AuthField label="Email" error={errors.email?.message}><AuthInput type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} /></AuthField>
        <AuthField label="Password" error={errors.password?.message}><PasswordInput autoComplete="current-password" {...register("password")} /></AuthField>
        <div className="text-right text-xs"><Link to="/forgot-password" className="font-medium text-brand hover:underline">Forgot password?</Link></div>
        <button className={authButton} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Log in</button>
      </form>
      <p className="mt-5 text-xs text-muted">New to TalentFlow AI? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></p>
    </AuthShell>);
}
