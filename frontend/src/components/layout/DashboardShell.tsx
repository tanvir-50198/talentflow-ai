import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings as Cog, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "@/components/common/Avatar";
import { Logo } from "@/components/common/Logo";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: any; end?: boolean };

export function DashboardShell({ nav, base }: { nav: NavItem[]; base: string }) {
  const { user, logout } = useAuth();
  const nav2 = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => api.get("/notifications"), refetchInterval: 30000 });

  useEffect(() => { setMobile(false); setMenu(false); }, [loc.pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const crumbs = loc.pathname.replace(base, "").split("/").filter(Boolean);
  const Side = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className={cn("mb-4 flex h-12 items-center px-2", collapsed && "justify-center")}>{collapsed ? <Logo /> : <Logo to={base} />}</div>
      {nav.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} title={n.label}
          className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", collapsed && "justify-center",
            isActive ? "bg-brand/10 text-brand shadow-[inset_0_0_0_1px_rgba(52,211,153,.25)]" : "text-muted hover:bg-white/5 hover:text-ink")}>
          <n.icon className="h-4 w-4 shrink-0" />{!collapsed && n.label}
        </NavLink>))}
    </nav>);

  return (
    <div className="flex min-h-screen">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r border-line bg-surface/80 transition-[width] md:block", collapsed ? "w-[72px]" : "w-60")}>{Side}</aside>
      {mobile && (
        <div className="fixed inset-0 z-40 md:hidden"><div className="absolute inset-0 bg-black/70" onClick={() => setMobile(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-line bg-surface">{Side}</aside></div>)}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur md:px-6">
          <button className="md:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden text-muted hover:text-ink md:block" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
          <div className="flex min-w-0 items-center gap-1 text-sm text-muted">
            <Link to={base} className="hover:text-ink capitalize">{user?.role}</Link>
            {crumbs.map((c, i) => <span key={i} className="flex items-center gap-1 truncate"><ChevronRight className="h-3 w-3" /><span className={cn("capitalize", i === crumbs.length - 1 && "text-ink")}>{c.replace(/-/g, " ")}</span></span>)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to={`${base}/notifications`} className="relative rounded-xl p-2 text-muted hover:bg-white/5 hover:text-ink" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {data?.unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-black">{data.unread}</span>}
            </Link>
            <div className="relative" ref={ref}>
              <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-white/5">
                <Avatar url={user?.avatar_url} name={user?.full_name} size={34} />
                <span className="hidden text-left text-sm leading-tight sm:block"><span className="block font-medium">{user?.full_name}</span><span className="block text-xs capitalize text-muted">{user?.role}</span></span>
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-card p-1.5 shadow-xl">
                  <Link to={`${base}/settings`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5"><Cog className="h-4 w-4" />Settings</Link>
                  <button onClick={async () => { await logout(); nav2("/"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-white/5"><LogOut className="h-4 w-4" />Log out</button>
                </div>)}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8"><Outlet /></main>
      </div>
    </div>);
}
