import { useEffect, useState } from "react";
import api from "../api/client";
import { Layout } from "../components/Layout";
import { ResumoProfessor } from "../types";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Closing() {
  const [resumo, setResumo] = useState<ResumoProfessor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ResumoProfessor>("/closing/me")
      .then((res) => setResumo(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Carregando fechamento...</p>
      </Layout>
    );
  }

  if (!resumo) return null;

  return (
    <Layout>
      <p className="text-sm text-ink-soft mb-1">Fechamento</p>
      <p className="font-display font-semibold text-xl mb-6">
        {resumo.periodo.label}
      </p>

      <div className="bg-teal text-white rounded-card p-5 mb-6">
        <p className="text-white/70 text-sm mb-1">Total do professor</p>
        <p className="font-display font-semibold text-4xl">
          {formatBRL(resumo.totalReceber)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface rounded-card p-4">
          <p className="text-ink-soft text-xs mb-1">Turmas</p>
          <p className="font-display font-semibold text-2xl">
            {resumo.totalTurmas}
          </p>
        </div>
        <div className="bg-surface rounded-card p-4">
          <p className="text-ink-soft text-xs mb-1">Personais</p>
          <p className="font-display font-semibold text-2xl">
            {resumo.totalPersonais}
          </p>
        </div>
        <div className="bg-surface rounded-card p-4">
          <p className="text-ink-soft text-xs mb-1">Valor das aulas</p>
          <p className="font-display font-semibold text-xl">
            {formatBRL(resumo.valorAulas)}
          </p>
        </div>
        <div className="bg-sea-light rounded-card p-4">
          <p className="text-sea text-xs mb-1">Como auxiliar</p>
          <p className="font-display font-semibold text-xl text-sea">
            {formatBRL(resumo.valorComoAuxiliar)}
          </p>
        </div>
      </div>

      {resumo.aulasComoAuxiliar.length > 0 && (
        <div className="mb-6">
          <p className="font-medium text-sm mb-2">Aulas como auxiliar</p>
          <div className="space-y-2">
            {resumo.aulasComoAuxiliar.map((a) => (
              <div
                key={a.id}
                className="bg-surface rounded-card px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{a.professor.name}</p>
                  <p className="text-xs text-ink-soft">
                    {new Date(a.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p className="text-sm font-medium text-sea">
                  {formatBRL(Number(a.assistantValue))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-ink-soft text-center">
        Envie este resumo ao responsável da arena pelo WhatsApp.
      </p>
    </Layout>
  );
}
