import { useEffect, useState } from "react";
import api from "../api/client";
import { Layout } from "../components/Layout";
import { ResumoGeral } from "../types";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GeneralClosing() {
  const [resumo, setResumo] = useState<ResumoGeral | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ResumoGeral>("/closing/general")
      .then((res) => setResumo(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Carregando...</p>
      </Layout>
    );
  }

  if (!resumo) return null;

  const totalGeral = resumo.professores.reduce((s, p) => s + p.totalReceber, 0);

  return (
    <Layout>
      <p className="text-sm text-ink-soft mb-1">Fechamento geral</p>
      <p className="font-display font-semibold text-xl mb-6">
        {resumo.periodo.label}
      </p>

      <div className="bg-teal text-white rounded-card p-5 mb-6">
        <p className="text-white/70 text-sm mb-1">
          Total de todos os professores
        </p>
        <p className="font-display font-semibold text-4xl">
          {formatBRL(totalGeral)}
        </p>
      </div>

      <div className="space-y-2">
        {resumo.professores.map((p) => (
          <div
            key={p.professorId}
            className="bg-surface rounded-card px-4 py-3.5"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{p.nome}</p>
              <p className="font-display font-semibold text-lg">
                {formatBRL(p.totalReceber)}
              </p>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              {p.totalAulas} aulas · auxiliar: {formatBRL(p.valorComoAuxiliar)}
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
