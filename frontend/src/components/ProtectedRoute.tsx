import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: Role;
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireRole && user?.role !== requireRole)
    return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
