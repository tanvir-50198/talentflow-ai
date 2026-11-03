import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn, initials } from "@/lib/utils";

const cache = new Map<string, string>();

/** Protected avatar: fetched with the auth token, falls back to initials. Never used by matching. */
export function Avatar({ url, name, size = 40, className, src: preview }: { url?: string | null; name?: string; size?: number; className?: string; src?: string }) {
  const [src, setSrc] = useState<string | undefined>(preview || (url ? cache.get(url) : undefined));
  useEffect(() => {
    if (preview) { setSrc(preview); return; }
    if (!url) { setSrc(undefined); return; }
    if (cache.has(url)) { setSrc(cache.get(url)); return; }
    let alive = true;
    api.blobUrl(url).then((u) => { cache.set(url, u); alive && setSrc(u); }).catch(() => alive && setSrc(undefined));
    return () => { alive = false; };
  }, [url, preview]);
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand/30 bg-brand/10 font-semibold text-brand", className)}>
      {src ? <img src={src} alt={name ? `${name}'s profile picture` : "Profile picture"} className="h-full w-full object-cover" /> : initials(name)}
    </span>);
}

export function CompanyLogo({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.4 }} className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface font-semibold text-brand">
      {url ? <img src={api.abs(url)} alt={`${name} logo`} className="h-full w-full object-cover" /> : initials(name)}
    </span>);
}
