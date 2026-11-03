import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InterviewCard } from "@/components/applications/InterviewCard";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (s?: string | null) => {
  if (!s) return "";
  const d = new Date(s.endsWith("Z") ? s : s + "Z");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Recruiter tools on the match page: message the candidate (they see it) and schedule an interview. */
export function RecruiterComms({ app, jobTitle, onDone }: { app: any; jobTitle: string; onDone: () => void }) {
  const iv = app.interview;
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const [mode, setMode] = useState<"online" | "onsite">("online");
  const [link, setLink] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const closed = app.status === "withdrawn";
  const fail = (e: any) => toast.error(e.message);

  const send = useMutation({ mutationFn: () => api.post(`/applications/${app.id}/message`, { message: msg }),
    onSuccess: () => { toast.success("Message sent to the candidate"); setMsg(""); onDone(); }, onError: fail });
  const save = useMutation({
    mutationFn: () => api.put(`/applications/${app.id}/interview`, { scheduled_at: new Date(when).toISOString(), mode,
      meeting_link: mode === "online" ? link.trim() : null, location: mode === "onsite" ? place.trim() : null, note: note.trim() || null }),
    onSuccess: () => { toast.success("Interview saved and candidate notified"); setEditing(false); onDone(); }, onError: fail });
  const cancel = useMutation({ mutationFn: () => api.del(`/applications/${app.id}/interview`),
    onSuccess: () => { toast.success("Interview cancelled"); onDone(); }, onError: fail });

  const open = () => {
    setWhen(toLocalInput(iv?.scheduled_at)); setMode(iv?.mode || "online"); setLink(iv?.meeting_link || ""); setPlace(iv?.location || ""); setNote(iv?.note || "");
    setEditing(true);
  };
  const ready = when && (mode === "online" ? /^https?:\/\//i.test(link.trim()) : place.trim());
  const minNow = toLocalInput(new Date().toISOString());

  return (
    <>
      <Card className="space-y-3">
        <h2 className="font-medium">Message to candidate</h2>
        <p className="text-xs text-muted">The candidate sees this on their applications page and gets a notification.</p>
        <Textarea rows={3} placeholder="Write a message…" value={msg} maxLength={2000} disabled={closed} onChange={(e) => setMsg(e.target.value)} />
        <Button size="sm" disabled={!msg.trim() || closed} loading={send.isPending} onClick={() => send.mutate()}>Send message</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">Interview</h2>
        {iv && !editing && <>
          <InterviewCard interview={iv} title={jobTitle} />
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={closed} onClick={open}>Reschedule</Button>
            <Button size="sm" variant="danger" loading={cancel.isPending} disabled={closed} onClick={() => confirm("Cancel this interview? The candidate will be notified.") && cancel.mutate()}>Cancel interview</Button></div></>}
        {!iv && !editing && <>
          <p className="text-xs text-muted">Pick a date and tell the candidate how to attend. Scheduling moves the application to “Interview”.</p>
          <Button size="sm" disabled={closed || app.status === "rejected"} onClick={open}>Schedule interview</Button></>}
        {editing && (
          <div className="space-y-3">
            <label className="block space-y-1.5"><span className="text-xs font-medium">Date and time</span>
              <Input type="datetime-local" min={minNow} value={when} onChange={(e) => setWhen(e.target.value)} className="[color-scheme:dark]" /></label>
            <div role="group" aria-label="Interview type" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
              {([["online", "Online"], ["onsite", "On-site"]] as const).map(([v, l]) => (
                <button type="button" key={v} aria-pressed={mode === v} onClick={() => setMode(v)}
                  className={cn("h-8 rounded-lg text-xs font-medium transition", mode === v ? "bg-brand/15 text-brand" : "text-muted hover:text-ink")}>{l}</button>))}
            </div>
            {mode === "online" ? (
              <div className="space-y-1.5"><span className="text-xs font-medium">Google Meet link</span>
                <Input placeholder="https://meet.google.com/abc-defg-hij" value={link} onChange={(e) => setLink(e.target.value)} />
                <a href="https://meet.google.com/new" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
                  <ExternalLink className="h-3 w-3" />Create a new Google Meet, then paste its link here</a></div>
            ) : (
              <label className="block space-y-1.5"><span className="text-xs font-medium">Location</span>
                <Input placeholder="Office address, floor or room" value={place} onChange={(e) => setPlace(e.target.value)} /></label>)}
            <label className="block space-y-1.5"><span className="text-xs font-medium">Note for the candidate (optional)</span>
              <Textarea rows={2} placeholder="What to prepare or bring" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <div className="flex gap-2"><Button size="sm" disabled={!ready} loading={save.isPending} onClick={() => save.mutate()}>{iv ? "Update interview" : "Schedule interview"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Back</Button></div>
          </div>)}
      </Card>
    </>);
}
