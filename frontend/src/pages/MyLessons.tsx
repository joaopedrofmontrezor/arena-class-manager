import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Layout } from "../components/Layout";
import { EditLessonModal } from "../components/EditLessonModal";
import { Lesson } from "../types";
import {
  getPeriodoAtual,
  getPeriodoAnterior,
  getProximoPeriodo,
  toQueryDate,
  Periodo,
} from "../utils/period";

function formatBRL(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function MyLessons() {
  const [periodo, setPeriodo] = useState<Periodo>(getPeriodoAtual());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState<Lesson | null>(null);

  const periodoAtual = getPeriodoAtual();
  const estaNoPeriodoAtual =
    toQueryDate(periodo.start) === toQueryDate(periodoAtual.start);

  
  const avisoPeriodoPassado = estaNoPeriodoAtual
    ? undefined
    : `Este período (${periodo.label}) já passou. Alterar a aula muda o fechamento dele.`;

  function load() {
    setLoading(true);
    api
      .get<Lesson[]>("/lessons", {
        params: {
          start: toQueryDate(periodo.start),
          end: toQueryDate(periodo.end),
        },
      })
      .then((res) => setLessons(res.data))
      .catch((err) =>
        setActionError(getErrorMessage(err, "Não foi possível carregar.")),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setActionError("");
    load();
  }, [periodo]);

  async function handleDelete(lesson: Lesson) {
    const aviso = estaNoPeriodoAtual
      ? ""
      : `\n\nATENÇÃO: este período (${periodo.label}) já passou. Excluir vai alterar o fechamento dele.`;
    if (
      !confirm(
        `Excluir a aula de ${formatDate(lesson.date)} às ${lesson.time}?${aviso}`,
      )
    )
      return;
    setActionError("");
    try {
      await api.delete(`/lessons/${lesson.id}`);
      load();
    } catch (err) {
      setActionError(getErrorMessage(err, "Não foi possível excluir a aula."));
    }
  }

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
          <p className="text-sm text-ink-soft">Minhas aulas</p>
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

      <div className="text-center mb-4">
        {estaNoPeriodoAtual ? (
          <Link to="/aulas/nova" className="text-xs text-coral font-medium">
            + Nova aula
          </Link>
        ) : (
          <button
            onClick={() => setPeriodo(periodoAtual)}
            className="text-xs text-coral font-medium underline"
          >
            Voltar para o período atual
          </button>
        )}
      </div>

      {loading && <p className="text-ink-soft text-sm">Carregando...</p>}
      {actionError && (
        <p className="text-sm text-coral-dark mb-3">{actionError}</p>
      )}

      {!loading && lessons.length === 0 && (
        <div className="bg-surface rounded-card p-6 text-center">
          <p className="text-ink-soft text-sm">
            Nenhuma aula registrada neste período.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="bg-surface rounded-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm">
                  {formatDate(lesson.date)} · {lesson.time}
                </p>
                <span
                  className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    lesson.type === "TURMA"
                      ? "bg-sand text-ink"
                      : "bg-sea-light text-sea"
                  }`}
                >
                  {lesson.type === "TURMA" ? "Turma" : "Personal"}
                </span>
              </div>
              <p className="font-display font-semibold text-lg">
                {formatBRL(lesson.professorValue)}
              </p>
            </div>

            <p className="text-xs text-ink-soft">
              {lesson.assistant
                ? `Auxiliar: ${lesson.assistant.name} (${formatBRL(
                    lesson.assistantValue,
                  )})`
                : "Sem auxiliar"}
            </p>
            {lesson.observation && (
              <p className="text-xs text-ink-soft mt-1 italic">
                "{lesson.observation}"
              </p>
            )}

            <div className="flex gap-4 mt-3 pt-3 border-t border-black/5">
              <button
                onClick={() => setEditing(lesson)}
                className="text-xs font-medium text-teal"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(lesson)}
                className="text-xs font-medium text-coral-dark"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditLessonModal
          lesson={editing}
          aviso={avisoPeriodoPassado}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </Layout>
  );
}
