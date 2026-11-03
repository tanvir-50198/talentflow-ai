import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, ErrorState, Loading, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { cn, fmtDateTime } from "@/lib/utils";

export default function Notifications() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["notifications"], queryFn: () => api.get("/notifications") });
  const done = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const readAll = useMutation({ mutationFn: () => api.post("/notifications/read-all", {}), onSuccess: done });
  const readOne = useMutation({ mutationFn: (id: number) => api.patch(`/notifications/${id}/read`, {}), onSuccess: done });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <div>
      <PageHeader title="Notifications" text={`${data.unread} unread`} actions={data.unread > 0 && <Button variant="outline" size="sm" onClick={() => readAll.mutate()}>Mark all as read</Button>} />
      {!data.items.length ? <EmptyState title="No notifications yet" text="Updates about applications and CV processing will appear here." /> : (
        <ul className="space-y-2">{data.items.map((n: any) => (
          <li key={n.id}><button onClick={() => { if (!n.is_read) readOne.mutate(n.id); if (n.link) nav(n.link); }}
            className={cn("flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:bg-white/[0.04]", n.is_read ? "border-line bg-card/40" : "border-brand/30 bg-brand/5")}>
            <Bell className={cn("mt-0.5 h-4 w-4", n.is_read ? "text-muted" : "text-brand")} />
            <span className="flex-1"><b className="block text-sm font-medium">{n.title}</b><span className="text-sm text-muted">{n.message}</span></span>
            <span className="text-xs text-muted">{fmtDateTime(n.created_at)}</span></button></li>))}</ul>)}
    </div>);
}
