import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge, Button, EmptyState, ErrorState, Loading, PageHeader, Table, Td, Th } from "@/components/ui";
import { api, openCV } from "@/lib/api";
import { fmtDate, fmtSize } from "@/lib/utils";

export default function MyCVs() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const target = useRef<number>(0);
  const { data, isLoading, error } = useQuery({ queryKey: ["cvs"], queryFn: () => api.get("/cvs") });
  const done = (msg: string) => () => { toast.success(msg); qc.invalidateQueries({ queryKey: ["cvs"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); };
  const fail = (e: any) => toast.error(e.message);
  const up = useMutation({ mutationFn: (f: File) => { const fd = new FormData(); fd.append("file", f); return api.upload("/cvs/upload", fd); }, onSuccess: done("CV uploaded"), onError: fail });
  const rep = useMutation({ mutationFn: (f: File) => { const fd = new FormData(); fd.append("file", f); return api.upload(`/cvs/${target.current}/replace`, fd, "PUT"); }, onSuccess: done("CV replaced"), onError: fail });
  const def = useMutation({ mutationFn: (id: number) => api.patch(`/cvs/${id}/default`, {}), onSuccess: done("Default CV updated"), onError: fail });
  const del = useMutation({ mutationFn: (id: number) => api.del(`/cvs/${id}`), onSuccess: done("CV deleted"), onError: fail });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <div>
      <PageHeader title="My CVs" text="Keep several versions and pick one for each application. PDF or DOCX, up to 5 MB." actions={
        <Button loading={up.isPending} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Upload CV</Button>} />
      <input ref={fileRef} type="file" hidden accept=".pdf,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) up.mutate(f); e.target.value = ""; }} />
      <input ref={replaceRef} type="file" hidden accept=".pdf,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) rep.mutate(f); e.target.value = ""; }} />
      {!data.items.length ? <EmptyState title="No CVs yet" text="Upload a CV to apply for jobs. We read it to show recruiters the evidence behind your match." action={<Button onClick={() => fileRef.current?.click()}>Upload your first CV</Button>} /> : (
        <Table><thead><tr><Th>File</Th><Th>Uploaded</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead><tbody>
          {data.items.map((c: any) => (
            <tr key={c.id}><Td><div className="flex items-center gap-3"><FileText className="h-4 w-4 text-brand" /><div><span className="font-medium">{c.filename}</span> {c.is_default && <Badge tone="green" className="ml-1">Default</Badge>}<p className="text-xs text-muted">{fmtSize(c.size)}</p></div></div></Td>
              <Td className="text-muted">{fmtDate(c.created_at)}</Td>
              <Td><StatusBadge kind="proc" status={c.status} />{c.error && <p className="mt-1 max-w-xs text-xs text-rose-300">{c.error}</p>}</Td>
              <Td><div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" title="Download" onClick={() => openCV(c.id, c.filename).catch(fail)}><Download className="h-4 w-4" /></Button>
                {!c.is_default && c.status === "completed" && <Button size="sm" variant="ghost" title="Set as default" onClick={() => def.mutate(c.id)}><Star className="h-4 w-4" /></Button>}
                <Button size="sm" variant="ghost" title="Replace" onClick={() => { target.current = c.id; replaceRef.current?.click(); }}><RefreshCw className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" title="Delete" onClick={() => confirm(`Delete ${c.filename}?`) && del.mutate(c.id)}><Trash2 className="h-4 w-4 text-rose-300" /></Button></div></Td></tr>))}
        </tbody></Table>)}
    </div>);
}
