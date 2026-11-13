import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Layout } from "../components/Layout";
import {
  AcaoAuditoria,
  PaginaAuditoria,
  RegistroAuditoria,
  User,
} from "../types";
import {
  getPeriodoAtual,
  getPeriodoAnterior,
  getProximoPeriodo,
  toQueryDate,
  Periodo,
} from "../utils/period";

const ROTULOS: Record<AcaoAuditoria, { texto: string; classe: string }> = {
  AULA_CRIADA: { texto: "Aula criada", classe: "bg-sea-light text-sea" },
  AULA_EDITADA: { texto: "Aula editada", classe: "bg-sand text-ink" },
  AULA_EXCLUIDA: { texto: "Aula excluída", classe: "bg-coral/10 text-coral-dark" },
  PERIODO_FECHADO: { texto: "Período fechado", classe: "bg-sea-light text-sea" },
  PERIODO_REABERTO: { texto: "Período reaberto", classe: "bg-coral/10 text-coral-dark" },
  PAGAMENTO_MARCADO: { texto: "Pagamento", classe: "bg-sea-light text-sea" },
  PAGAMENTO_DESFEITO: { texto: "Pagamento desfeito", classe: "bg-coral/10 text-coral-dark" },
};

function formatarQuando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Historico() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [professorId, setProfessorId] = useState("");
  const [professores, setProfessores] = useState<User[]>([]);
  const [itens, setItens] = useState<RegistroAuditoria[]>([]);
  const [proximoCursor, setProximoCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  // Evita que uma resposta antiga sobrescreva a de um filtro mais novo.
  const versao = useRef(0);

  useEffect(() => {
    api
      .get<User[]>("/users/all", { params: { role: "PROFESSOR" } })
      .then((res) => setProfessores(res.data))
      .catch(() => undefined);
  }, []);

  const buscar = useCallback(
    async (cursor?: string) => {
      const minha = ++versao.current;
      const params: Record<string, string> = {};
      if (periodo) params.periodStart = toQueryDate(periodo.start);
      if (professorId) params.professorId = professorId;
      if (cursor) params.cursor = cursor;
      try {
        const res = await api.get<PaginaAuditoria>("/audit", { params });
        if (minha !== versao.current) return;
        setItens((atual) =>
          cursor ? [...atual, ...res.data.itens] : res.data.itens,
        );
        setProximoCursor(res.data.proximoCursor);
        setErro("");
      } catch (err) {
        if (minha !== versao.current) return;
        setErro(getErrorMessage(err, "Não foi possível carregar o histórico."));
      } finally {
        if (minha === versao.current) {
          setLoading(false);
          setCarregandoMais(false);
        }
      }
    },
    [periodo, professorId],
  );

  useEffect(() => {
    setLoading(true);
    setItens([]);
    setProximoCursor(null);
    buscar();
  }, [buscar]);

  return (
    <Layout>
      <div className="mb-4">
        <button
          onClick={() => navigate("/fechamento-geral")}
          className="text-xs text-ink-soft mb-1"
        >
          ← Voltar
        </button>
        <p className="font-display font-semibold text-xl">
          Histórico de alterações
        </p>
        <p className="text-xs text-ink-soft">
          Quem mexeu em aulas e no fechamento, e quando.
        </p>
      </div>

      <div className="bg-surface rounded-card p-4 mb-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-soft mb-1">
            Período
          </label>
          {periodo ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPeriodo(getPeriodoAnterior(periodo))}
                className="text-ink-soft text-lg px-2"
                aria-label="Período anterior"
              >
                ◀
              </button>
              <div className="text-center">
                <p className="text-sm font-medium">{periodo.label}</p>
                <button
                  onClick={() => setPeriodo(null)}
                  className="text-xs text-coral underline"
                >
                  Ver todos os períodos
                </button>
              </div>
              <button
                onClick={() => setPeriodo(getProximoPeriodo(periodo))}
                className="text-ink-soft text-lg px-2"
                aria-label="Próximo período"
              >
                ▶
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm">Todos os períodos</p>
              <button
                onClick={() => setPeriodo(getPeriodoAtual())}
                className="text-xs text-coral underline"
              >
                Filtrar por período
              </button>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="filtro-professor"
            className="block text-xs font-medium text-ink-soft mb-1"
          >
            Professor
          </label>
          <select
            id="filtro-professor"
            value={professorId}
            onChange={(e) => setProfessorId(e.target.value)}
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Todos</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-ink-soft text-sm">Carregando...</p>}
      {erro && <p className="text-sm text-coral-dark mb-3">{erro}</p>}

      {!loading && !erro && itens.length === 0 && (
        <div className="bg-surface rounded-card p-6 text-center">
          <p className="text-ink-soft text-sm">
            Nenhuma alteração registrada com esses filtros.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {itens.map((item) => {
          const rotulo = ROTULOS[item.action] ?? {
            texto: item.action,
            classe: "bg-sand text-ink",
          };
          return (
            <div key={item.id} className="bg-surface rounded-card p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${rotulo.classe}`}
                >
                  {rotulo.texto}
                </span>
                <span className="text-xs text-ink-soft whitespace-nowrap">
                  {formatarQuando(item.createdAt)}
                </span>
              </div>
              <p className="text-sm mt-2">{item.summary}</p>
              {item.changes && item.changes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {item.changes.map((c) => (
                    <li key={c.campo} className="text-xs text-ink-soft">
                      <span className="font-medium text-ink">{c.campo}:</span>{" "}
                      {c.de} <span aria-label="para">→</span>{" "}
                      <span className="text-ink">{c.para}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-ink-soft mt-2">Por {item.actorName}</p>
            </div>
          );
        })}
      </div>

      {proximoCursor && (
        <button
          onClick={() => {
            setCarregandoMais(true);
            buscar(proximoCursor);
          }}
          disabled={carregandoMais}
          className="w-full mt-4 bg-surface text-ink text-sm font-medium rounded-card px-4 py-2.5 disabled:opacity-50"
        >
          {carregandoMais ? "Carregando..." : "Carregar mais"}
        </button>
      )}
    </Layout>
  );
}
