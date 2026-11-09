import { Navigate, Outlet } from "react-router-dom";
import { Loading } from "@/components/ui";
import { homeFor, useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ role }: { role: "candidate" | "recruiter" }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
