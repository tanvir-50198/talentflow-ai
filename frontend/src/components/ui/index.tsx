import { Loader2, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

type Variant = "primary" | "light" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
export const btn = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
    { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-sm" }[size],
    { primary: "bg-brand text-[#03140d] hover:bg-brand-600 shadow-glow", light: "bg-white text-black hover:bg-white/90",
      outline: "border border-line bg-white/[0.02] text-ink hover:bg-white/[0.06]", ghost: "text-muted hover:text-ink hover:bg-white/[0.05]",
      danger: "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" }[variant], extra);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }>(
  ({ variant, size, loading, className, children, disabled, ...p }, ref) => (
    <button ref={ref} disabled={disabled || loading} className={btn(variant, size, className)} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>));

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn("rounded-2xl border border-line bg-card/80 p-5", className)} {...p} />;

const fieldCls = "w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20 disabled:opacity-60";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) =>
  <input ref={ref} className={cn(fieldCls, "h-10", className)} {...p} />);
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) =>
  <textarea ref={ref} className={cn(fieldCls, "py-2 min-h-[96px]", className)} {...p} />);
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) =>
  <select ref={ref} className={cn(fieldCls, "h-10 pr-8", className)} {...p} />);

export function Field({ label, error, hint, children, className }: { label: string; error?: any; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium text-ink/90">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs text-rose-400">{String(error)}</span>}
    </label>);
}

const tones: Record<Tone, string> = {
  green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25", amber: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  rose: "bg-rose-400/10 text-rose-300 border-rose-400/25", sky: "bg-sky-400/10 text-sky-300 border-sky-400/25",
  slate: "bg-white/5 text-muted border-white/10", violet: "bg-violet-400/10 text-violet-300 border-violet-400/25",
};
export const Badge = ({ tone = "slate", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) =>
  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...p} />;

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("h-5 w-5 animate-spin text-brand", className)} />;
export const Loading = () => <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;
export const EmptyState = ({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
    <p className="font-medium">{title}</p>{text && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>);
export const ErrorState = ({ error }: { error: any }) => (
  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">{error?.message || "Something went wrong."}</div>);

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-6" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><X className="h-4 w-4" /></button></div>
        {children}
      </div>
    </div>);
}

export const PageHeader = ({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{text && <p className="mt-1 max-w-2xl text-sm text-muted">{text}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>);

export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-2xl border border-line bg-card/60"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>);
export const Th = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn("border-b border-line px-4 py-3 text-xs font-medium text-muted", className)} {...p} />;
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn("border-b border-line/60 px-4 py-3 align-middle", className)} {...p} />;
