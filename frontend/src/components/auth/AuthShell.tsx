import { Check, Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Split-screen layout used by the Log in and Create account pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-[#060a08] text-ink lg:grid-cols-2">
      <aside className="relative flex flex-col justify-between overflow-hidden border-line/60 p-6 lg:border-r">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_420px_at_55%_45%,rgba(52,211,153,.10),transparent_70%)]" />
        <Link to="/" className="relative flex w-fit items-center gap-2.5 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/30 bg-brand/10">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2.5 4h11M2.5 8h7M2.5 12h4" /></svg>
          </span>
          <span>TalentFlow <span className="text-brand">AI</span></span>
        </Link>

        <div className="relative hidden max-w-md px-6 lg:block lg:pl-[12%]">
          <h2 className="text-[28px] font-bold leading-tight tracking-tight">Every skill comes with its evidence.</h2>
          <ul className="mt-6 space-y-3 text-[13px] text-muted">
            {["See where each required skill appears in the CV.", "Move people from Applied to Offered in one list.", "Every status change is recorded."].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>{t}</li>))}
          </ul>
        </div>

        <p className="relative hidden text-[11px] text-muted lg:block">Matches are suggestions. The recruiter decides.</p>
      </aside>

      <main className="flex items-center px-6 pb-12 pt-4 lg:px-0 lg:py-12 lg:pl-[22%]">
        <div className="w-full max-w-[340px]">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>);
}

export const authField = "h-9 w-full rounded-lg border border-transparent bg-[#18211d] px-3 text-[13px] text-ink placeholder:text-muted/60 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/20";

export function AuthField({ label, hint, error, children }: { label: string; hint?: string; error?: any; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink">{label}</span>
      {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-xs text-rose-400">{String(error)}</span>}
    </label>);
}

export const AuthInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) =>
  <input ref={ref} className={cn(authField, className)} {...p} />);

export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((p, ref) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={show ? "text" : "password"} className={cn(authField, "pr-9")} {...p} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>);
});

export const authButton = "mt-1 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#4ade9a] text-[13px] font-semibold text-[#04140c] transition hover:bg-[#6ee7b0] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60";
