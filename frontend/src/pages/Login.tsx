import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/errors";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "E-mail ou senha incorretos."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-teal px-6">
      <div className="max-w-sm w-full mx-auto">
        <p className="font-display font-semibold text-3xl text-white mb-1">
          Arena Futevôlei
        </p>
        <p className="text-white/70 text-sm mb-8">
          Controle de aulas e fechamentos
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-card p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-coral"
              placeholder="voce@arena.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-coral"
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-coral-dark">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral text-white font-medium rounded-lg py-3 hover:bg-coral-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
