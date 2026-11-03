import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, tokens } from "@/lib/api";
import type { User } from "@/types";

type Ctx = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (d: { email: string; password: string; full_name: string; role: string }) => Promise<User>;
  logout: () => Promise<void>; reload: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);
export const homeFor = (u: User) => (u.role === "recruiter" ? "/recruiter" : "/candidate");

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokens.access());

  const reload = async () => {
    try { setUser(await api.get("/profiles/me")); } catch { setUser(null); } finally { setLoading(false); }
  };
  useEffect(() => {
    if (tokens.access()) reload(); else setLoading(false);
    const h = () => { setUser(null); qc.clear(); };
    window.addEventListener("tf:logout", h);
    return () => window.removeEventListener("tf:logout", h);
  }, []);

  const finish = async (r: any) => { tokens.set(r); const u = await api.get("/profiles/me"); setUser(u); return u as User; };
  const value: Ctx = {
    user, loading, reload,
    login: async (email, password) => finish(await api.post("/auth/login", { email, password })),
    register: async (d) => finish(await api.post("/auth/register", d)),
    logout: async () => { try { await api.post("/auth/logout", {}); } catch {} tokens.clear(); setUser(null); qc.clear(); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
