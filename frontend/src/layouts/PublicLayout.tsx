import { Link, Outlet } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { btn } from "@/components/ui";
import { homeFor, useAuth } from "@/context/AuthContext";

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-4 z-40 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-5xl items-center justify-between rounded-2xl border border-line bg-bg/70 px-4 py-2.5 backdrop-blur">
      <Logo />
      <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
        <Link to="/" className="hover:text-ink">Home</Link>
        <a href="/#features" className="hover:text-ink">Features</a>
        <a href="/#how" className="hover:text-ink">How It Works</a>
        <Link to="/jobs" className="hover:text-ink">Jobs</Link>
      </nav>
      <div className="flex items-center gap-2">
        {user ? <Link to={homeFor(user)} className={btn("primary", "sm")}>Dashboard</Link> : <>
          <Link to="/login" className={btn("outline", "sm")}>Log in</Link>
          <Link to="/register" className={btn("primary", "sm")}>Get Started</Link></>}
      </div>
    </header>);
}

export default function PublicLayout() {
  return (
    <div className="page-glow min-h-screen"><PublicHeader /><main className="mx-auto max-w-6xl px-4 py-10"><Outlet /></main></div>);
}
