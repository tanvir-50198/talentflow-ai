import { Badge } from "@/components/ui";
import { band } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ScoreBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return <span className={cn("block h-1.5 w-full rounded-full bg-white/10", className)}><span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></span>;
}

export function ScoreNumber({ score, size = "md" }: { score?: number | null; size?: "md" | "lg" }) {
  const b = band(score);
  return <span className={cn("font-semibold tabular-nums", b.text, size === "lg" ? "text-4xl" : "text-lg")}>{score == null ? "–" : Math.round(score)}</span>;
}

export const BandBadge = ({ score }: { score?: number | null }) => { const b = band(score); return <Badge tone={b.tone}>{b.label}</Badge>; };
