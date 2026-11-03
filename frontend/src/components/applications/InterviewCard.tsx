import { CalendarPlus, MapPin, Video } from "lucide-react";
import { btn } from "@/components/ui";
import { cn } from "@/lib/utils";

const toDate = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");
const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");

export const fmtInterview = (s: string) =>
  toDate(s).toLocaleString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

function calendarUrl(iv: any, title: string) {
  const start = toDate(iv.scheduled_at), end = new Date(start.getTime() + 60 * 60 * 1000);
  const q = new URLSearchParams({ action: "TEMPLATE", text: `Interview: ${title}`, dates: `${stamp(start)}/${stamp(end)}`,
    details: [iv.meeting_link && `Join: ${iv.meeting_link}`, iv.note].filter(Boolean).join("\n"), location: iv.meeting_link || iv.location || "" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Shows the interview date, how to join, and any note. Used on both the candidate and recruiter side. */
export function InterviewCard({ interview: iv, title, candidate = false, className }: { interview: any; title: string; candidate?: boolean; className?: string }) {
  if (!iv) return null;
  const online = iv.mode === "online";
  const past = toDate(iv.scheduled_at).getTime() + 60 * 60 * 1000 < Date.now();
  return (
    <div className={cn("rounded-xl border border-violet-400/25 bg-violet-400/5 p-4 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {online ? <Video className="h-4 w-4 text-violet-300" /> : <MapPin className="h-4 w-4 text-violet-300" />}
        <b className="font-medium">{past ? "Interview" : "Upcoming interview"}</b>
        <span className="rounded-full border border-violet-400/25 px-2 py-0.5 text-xs text-violet-300">{online ? "Online" : "On-site"}</span>
      </div>
      <p className="mt-2 font-medium">{fmtInterview(iv.scheduled_at)}</p>
      {online
        ? <p className="mt-1 break-all text-muted">Meeting link: <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener" className="text-brand hover:underline">{iv.meeting_link}</a></p>
        : <p className="mt-1 text-muted">Location: <span className="text-ink">{iv.location}</span></p>}
      {iv.note && <p className="mt-2 whitespace-pre-line text-muted">{iv.note}</p>}
      {candidate && !past && (
        <div className="mt-3 flex flex-wrap gap-2">
          {online && <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener" className={btn("primary", "sm")}><Video className="h-3.5 w-3.5" />Join meeting</a>}
          <a href={calendarUrl(iv, title)} target="_blank" rel="noreferrer noopener" className={btn("outline", "sm")}><CalendarPlus className="h-3.5 w-3.5" />Add to Google Calendar</a>
        </div>)}
    </div>);
}
