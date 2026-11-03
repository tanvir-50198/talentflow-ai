import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CompanyLogo } from "@/components/common/Avatar";
import { Button, Card, ErrorState, Field, Input, Loading, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { COMPANY_SIZES } from "@/lib/constants";

const empty = { name: "", description: "", industry: "", website: "", location: "", size: "", contact_email: "", contact_phone: "" };

export default function CompanyProfile() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["company"], queryFn: () => api.get("/companies/me") });
  const [f, setF] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const logo = useRef<HTMLInputElement>(null);
  useEffect(() => { if (data) setF({ ...empty, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])) }); }, [data]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["company"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); };
  const save = async () => {
    setBusy(true);
    try { data ? await api.put(`/companies/${data.id}`, f) : await api.post("/companies", f); toast.success(data ? "Company saved" : "Company created"); refresh(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const upLogo = async (file?: File) => {
    if (!file || !data) return;
    try { const fd = new FormData(); fd.append("file", file); await api.upload(`/companies/${data.id}/logo`, fd); toast.success("Logo updated"); refresh(); } catch (e: any) { toast.error(e.message); }
  };
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Company profile" text={data ? "Shown on your job listings." : "Create your company to start posting jobs."} />
      {data && <Card className="flex items-center gap-4"><CompanyLogo url={data.logo_url} name={data.name} size={64} />
        <div><input ref={logo} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => upLogo(e.target.files?.[0])} />
          <Button variant="outline" size="sm" onClick={() => logo.current?.click()}>{data.logo_url ? "Replace logo" : "Upload logo"}</Button><p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 2 MB.</p></div></Card>}
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" className="sm:col-span-2"><Input value={f.name} onChange={set("name")} /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={set("description")} /></Field>
        <Field label="Industry"><Input value={f.industry} onChange={set("industry")} /></Field>
        <Field label="Company size"><Select value={f.size} onChange={set("size")}><option value="">Select size</option>{COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Website"><Input value={f.website} onChange={set("website")} placeholder="https://" /></Field>
        <Field label="Location"><Input value={f.location} onChange={set("location")} /></Field>
        <Field label="Contact email"><Input type="email" value={f.contact_email} onChange={set("contact_email")} /></Field>
        <Field label="Contact phone"><Input value={f.contact_phone} onChange={set("contact_phone")} /></Field>
      </Card>
      <Button loading={busy} disabled={f.name.trim().length < 2} onClick={save}>{data ? "Save company" : "Create company"}</Button>
    </div>);
}
