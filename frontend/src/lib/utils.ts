import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...a: any[]) => twMerge(clsx(a));
const toDate = (s: string) => new Date(s.length <= 10 ? s : s.endsWith("Z") ? s : s + "Z");
export const fmtDate = (s?: string | null) =>
  s ? toDate(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
export const fmtDateTime = (s?: string | null) =>
  s ? toDate(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtSize = (n = 0) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
export const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
export const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
