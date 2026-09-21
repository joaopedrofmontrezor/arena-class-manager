import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { Layout } from "../components/Layout";
import { ResumoProfessor } from "../types";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Dashboard() {
  const [resumo, setResumo] = useState<ResumoProfessor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ResumoProfessor>("/closing/me")
      .then((res) => setResumo(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <p className="text-sm text-ink-soft mb-1">Período atual</p>
      <p className="font-display font-semibold text-lg mb-6">
        {loading ? "..." : resumo?.periodo.label}
      </p>

      <div className="bg-teal text-white rounded-card p-5 mb-4">
        <p className="text-white/70 text-sm mb-1">Total a receber</p>
        <p className="font-display font-semibold text-4xl">
          {loading ? "—" : formatBRL(resumo?.totalReceber ?? 0)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface rounded-card p-4">
          <p className="text-ink-soft text-xs mb-1">Turmas</p>
          <p className="font-display font-semibold text-2xl">
            {loading ? "—" : resumo?.totalTurmas}
          </p>
        </div>
        <div className="bg-surface rounded-card p-4">
          <p className="text-ink-soft text-xs mb-1">Personais</p>
          <p className="font-display font-semibold text-2xl">
            {loading ? "—" : resumo?.totalPersonais}
          </p>
        </div>
      </div>

      <div className="bg-sea-light rounded-card p-4 mb-8">
        <p className="text-sea text-xs font-medium mb-1">Como auxiliar</p>
        <p className="font-display font-semibold text-xl text-sea">
          {loading ? "—" : formatBRL(resumo?.valorComoAuxiliar ?? 0)}
        </p>
      </div>

      <Link
        to="/aulas/nova"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-coral text-white font-medium rounded-full px-6 py-3.5 shadow-lg shadow-coral/30 hover:bg-coral-dark transition-colors"
      >
        + Nova aula
      </Link>
    </Layout>
  );
}
