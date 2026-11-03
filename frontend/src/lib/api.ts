const ORIGIN = (import.meta.env.VITE_API_ORIGIN as string) || "";
const BASE = ORIGIN + "/api/v1";

export const tokens = {
  access: () => localStorage.getItem("tf_access"),
  refresh: () => localStorage.getItem("tf_refresh"),
  set: (r: any) => { localStorage.setItem("tf_access", r.access_token); localStorage.setItem("tf_refresh", r.refresh_token); },
  clear: () => { localStorage.removeItem("tf_access"); localStorage.removeItem("tf_refresh"); },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

function message(body: any, status: number) {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e: any) => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`.replace(/^: /, "")).join("; ");
  return status >= 500 ? "Something went wrong on the server. Try again." : "Request failed";
}

let refreshing: Promise<boolean> | null = null;
async function refresh() {
  const rt = tokens.refresh();
  if (!rt) return false;
  refreshing ||= fetch(BASE + "/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: rt }) })
    .then(async (r) => { if (!r.ok) return false; tokens.set(await r.json()); return true; })
    .catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}

async function raw(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const t = tokens.access();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(BASE + path, { ...init, headers });
  if (res.status === 401 && retry && tokens.refresh() && !path.startsWith("/auth/")) {
    if (await refresh()) return raw(path, init, false);
    tokens.clear();
    window.dispatchEvent(new Event("tf:logout"));
  }
  return res;
}

async function json(path: string, init: RequestInit = {}) {
  const res = await raw(path, init);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(message(body, res.status), res.status);
  return body;
}

const send = (method: string) => (path: string, data?: any) =>
  json(path, { method, headers: data !== undefined ? { "Content-Type": "application/json" } : {}, body: data !== undefined ? JSON.stringify(data) : undefined });

export const api = {
  get: (path: string, params?: Record<string, any>) => {
    const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)])).toString() : "";
    return json(path + (q === "?" ? "" : q));
  },
  post: send("POST"), put: send("PUT"), patch: send("PATCH"), del: send("DELETE"),
  upload: (path: string, form: FormData, method = "POST") => json(path, { method, body: form }),
  /** Fetch a protected file and return an object URL (avatars, CV downloads). */
  async blobUrl(urlOrPath: string) {
    const isApi = urlOrPath.startsWith("/api/v1");
    const res = await raw(isApi ? urlOrPath.slice(7) : urlOrPath);
    if (!res.ok) throw new ApiError("Could not load file", res.status);
    return URL.createObjectURL(await res.blob());
  },
  abs: (u?: string | null) => (u ? ORIGIN + u : undefined),
};

export async function openCV(cvId: number, filename: string) {
  const url = await api.blobUrl(`/cvs/${cvId}/download`);
  if (filename.toLowerCase().endsWith(".pdf")) window.open(url, "_blank");
  else { const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); }
}
