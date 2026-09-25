import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Layout } from "../components/Layout";
import { User } from "../types";

export function Professores() {
  const navigate = useNavigate();
  const [professores, setProfessores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api
      .get<User[]>('/users/all', { params: { role: 'PROFESSOR' } })
      .then((res) => setProfessores(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/users", { name, email, password, role: "PROFESSOR" });
      setName("");
      setEmail("");
      setPassword("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível criar o professor."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: User) {
    await api.patch(`/users/${p.id}`, { active: !p.active });
    load();
  }

  async function handleResetPassword(p: User) {
    const novaSenha = prompt(
      `Nova senha para ${p.name} (mínimo 6 caracteres):`,
    );
    if (!novaSenha) return;
    if (novaSenha.length < 6) {
      alert("Senha muito curta.");
      return;
    }
    await api.patch(`/users/${p.id}/password`, { newPassword: novaSenha });
    alert("Senha atualizada.");
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => navigate("/fechamento-geral")}
            className="text-xs text-ink-soft mb-1"
          >
            ← Voltar
          </button>
          <p className="font-display font-semibold text-xl">Professores</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm text-coral font-medium"
        >
          {showForm ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-surface rounded-card p-4 space-y-3 mb-5"
        >
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              Senha inicial
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-xs text-coral-dark">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-coral text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Criar professor"}
          </button>
        </form>
      )}

      {loading && <p className="text-ink-soft text-sm">Carregando...</p>}

      <div className="space-y-2">
        {professores.map((p) => (
          <div key={p.id} className="bg-surface rounded-card px-4 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm flex items-center gap-1.5">
                  {p.name}
                  {!p.active && (
                    <span className="text-[10px] font-normal text-ink-soft bg-black/5 px-1.5 py-0.5 rounded">
                      inativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">{p.email}</p>
              </div>
            </div>
            <div className="flex gap-4 pt-2 border-t border-black/5">
              <button
                onClick={() => toggleActive(p)}
                className={`text-xs font-medium ${p.active ? "text-coral-dark" : "text-sea"}`}
              >
                {p.active ? "Desativar" : "Reativar"}
              </button>
              <button
                onClick={() => handleResetPassword(p)}
                className="text-xs font-medium text-teal"
              >
                Redefinir senha
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
