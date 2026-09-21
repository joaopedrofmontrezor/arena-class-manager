import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex-1 py-3 text-center text-sm font-medium transition-colors ${
          isActive ? "text-coral" : "text-ink-soft"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="bg-teal text-white px-5 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-lg leading-tight">
              Arena Futevôlei
            </p>
            <p className="text-xs text-white/70">{user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-white/80 border border-white/30 rounded-full px-3 py-1.5 hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 py-5 pb-24 max-w-md w-full mx-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-md bg-surface border-t border-black/5 flex justify-around items-center py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <TabLink to="/dashboard" label="Início" />
        <TabLink to="/aulas" label="Aulas" />
        <TabLink to="/fechamento" label="Fechamento" />
        {user?.role === "OWNER" && (
          <TabLink to="/fechamento-geral" label="Geral" />
        )}
      </nav>
    </div>
  );
}
