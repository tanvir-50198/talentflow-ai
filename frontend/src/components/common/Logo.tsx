import { Link } from "react-router-dom";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/50 bg-brand/10 text-sm text-brand">H</span>
      <span>TalentFlow AI</span>
    </Link>);
}
