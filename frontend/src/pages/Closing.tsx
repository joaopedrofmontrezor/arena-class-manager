import { useEffect, useState } from "react";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Layout } from "../components/Layout";
import { ResumoProfessor } from "../types";
import {
  getPeriodoAtual,
  getPeriodoAnterior,
  getProximoPeriodo,
  toQueryDate,
  Periodo,
} from "../utils/period";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function Closing() {
  const [periodo, setPeriodo] = useState<Periodo>(getPeriodoAtual());
  const [resumo, setResumo] = useState<ResumoProfessor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const periodoAtual = getPeriodoAtual();
  const estaNoPeriodoAtual =
    toQueryDate(periodo.start) === toQueryDate(periodoAtual.start);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get<ResumoProfessor>("/closing/me", {
        params: {
          start: toQueryDate(periodo.start),
          end: toQueryDate(periodo.end),
        },
      })
      .then((res) => setResumo(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [periodo]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setPeriodo(getPeriodoAnterior(periodo))}
          className="text-ink-soft text-lg px-2 py-1 -ml-2"
          aria-label="Período anterior"
        >
          ◀
        </button>
        <div className="text-center">
          <p className="text-sm text-ink-soft">Fechamento</p>
          <p className="font-display font-semibold text-lg">{periodo.label}</p>
        </div>
        <button
          onClick={() => setPeriodo(getProximoPeriodo(periodo))}
          className="text-ink-soft text-lg px-2 py-1 -mr-2"
          aria-label="Próximo período"
        >
          ▶
        </button>
      </div>

      {!estaNoPeriodoAtual && (
        <div className="text-center mb-4">
          <button
            onClick={() => setPeriodo(periodoAtual)}
            className="text-xs text-coral font-medium underline"
          >
            Voltar para o período atual
          </button>
        </div>
      )}

      {estaNoPeriodoAtual && <div className="mb-4" />}

      {loading && (
        <p className="text-ink-soft text-sm text-center">Carregando...</p>
      )}
      {error && <p className="text-sm text-coral-dark text-center">{error}</p>}

      {!loading && !error && resumo && (
        <>
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

          {resumo.aulas.length > 0 && (
            <div className="mb-6">
              <p className="font-medium text-sm mb-2">Suas aulas no período</p>
              <div className="space-y-2">
                {resumo.aulas.map((a) => (
                  <div key={a.id} className="bg-surface rounded-card px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {formatDate(a.date)}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatBRL(Number(a.professorValue))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          a.type === "TURMA"
                            ? "bg-sand text-ink"
                            : "bg-sea-light text-sea"
                        }`}
                      >
                        {a.type === "TURMA" ? "Turma" : "Personal"}
                      </span>
                      <span className="text-xs text-ink-soft">
                        Auxiliar: {a.assistant?.name ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        {formatDate(a.date)}
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

          {resumo.aulas.length === 0 &&
            resumo.aulasComoAuxiliar.length === 0 && (
              <div className="bg-surface rounded-card p-6 text-center mb-6">
                <p className="text-ink-soft text-sm">
                  Nenhuma aula neste período.
                </p>
              </div>
            )}

          <p className="text-xs text-ink-soft text-center">
            Envie este resumo ao responsável da arena pelo WhatsApp.
          </p>
        </>
      )}
    </Layout>
  );
}
