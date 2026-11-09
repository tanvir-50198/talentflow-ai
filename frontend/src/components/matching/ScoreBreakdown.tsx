import { Check, CircleHelp } from "lucide-react";
import { Card } from "@/components/ui";
import { ScoreBar } from "./Score";

export function ScoreBreakdown({ components, evidence }: { components: any[]; evidence: any[] }) {
  return (
    <div className="space-y-4">
      {components.map((c) => {
        const ev = evidence.filter((e) => e.component === c.key);
        const found = ev.filter((e) => e.found), missing = ev.filter((e) => !e.found);
        return (
          <Card key={c.key}>
            <div className="flex items-baseline justify-between"><h3 className="font-medium">{c.name}</h3><span className="tabular-nums text-sm"><b className="text-base">{c.score}</b><span className="text-muted"> / {c.max}</span></span></div>
            <ScoreBar value={c.score} max={c.max} className="mt-2" />
            <p className="mt-3 text-sm text-muted">{c.explanation}</p>
            {!!found.length && (
              <div className="mt-4 space-y-2"><p className="text-xs font-medium text-emerald-300">Evidence found</p>
                {found.map((e, i) => (
                  <div key={i} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand" /><b className="font-medium">{e.label}</b>{e.section && <span className="text-xs text-muted">· {e.section} section</span>}</div>
                    {e.snippet && <p className="mt-1 border-l-2 border-brand/40 pl-3 text-xs italic text-muted">“{e.snippet}”</p>}
                    {e.note && <p className="mt-1 text-xs text-muted">{e.note}</p>}
                  </div>))}</div>)}
            {!!missing.length && (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-300"><CircleHelp className="h-3.5 w-3.5" />Not found in CV</p>
                <p className="mt-1 text-sm">{missing.map((m) => m.label).join(", ")}</p>
                <p className="mt-1 text-xs text-muted">Not found in the CV does not mean the candidate lacks this. Consider asking.</p></div>)}
          </Card>);
      })}
    </div>);
}
