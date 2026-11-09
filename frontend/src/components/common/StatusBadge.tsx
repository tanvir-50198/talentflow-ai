import { Badge } from "@/components/ui";
import { APP_STATUS, JOB_STATUS, PROC_STATUS } from "@/lib/constants";

const maps = { app: APP_STATUS, proc: PROC_STATUS, job: JOB_STATUS };
export function StatusBadge({ kind = "app", status }: { kind?: "app" | "proc" | "job"; status?: string | null }) {
  if (!status) return <span className="text-xs text-muted">—</span>;
  const m = maps[kind][status] || { label: status, tone: "slate" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
