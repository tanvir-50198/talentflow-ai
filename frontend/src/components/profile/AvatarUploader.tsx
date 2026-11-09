import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

/** Upload with preview before saving, replace, remove. Falls back to initials. */
export function AvatarUploader() {
  const { user, reload } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);

  const pick = (f?: File) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return toast.error("Use a JPG, PNG or WebP image");
    if (f.size > 2 * 1024 * 1024) return toast.error("The image must be smaller than 2 MB");
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  const reset = () => { setFile(null); setPreview(undefined); if (input.current) input.current.value = ""; };
  const save = async () => {
    if (!file) return; setBusy(true);
    try { const fd = new FormData(); fd.append("file", file); await api.upload("/profiles/me/avatar", fd); await reload(); toast.success("Profile picture saved"); reset(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.del("/profiles/me/avatar"); await reload(); toast.success("Profile picture removed"); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar url={user?.avatar_url} name={user?.full_name} size={80} src={preview} />
      <div className="space-y-2">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
        {file ? (
          <div className="flex gap-2"><Button size="sm" loading={busy} onClick={save}>Save picture</Button><Button size="sm" variant="outline" onClick={reset}>Cancel</Button></div>
        ) : (
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => input.current?.click()}><Camera className="h-3.5 w-3.5" />{user?.avatar_url ? "Replace" : "Upload"} picture</Button>
            {user?.avatar_url && <Button size="sm" variant="danger" loading={busy} onClick={remove}><Trash2 className="h-3.5 w-3.5" />Remove</Button>}</div>)}
        <p className="text-xs text-muted">JPG, PNG or WebP, up to 2 MB. Pictures never affect matching scores.</p>
      </div>
    </div>);
}
