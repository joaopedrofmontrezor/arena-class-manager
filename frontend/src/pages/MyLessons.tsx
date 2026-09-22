import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Layout } from "../components/Layout";
import { Lesson } from "../types";

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
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  function load() {
    setLoading(true);
    api
      .get<Lesson[]>("/lessons")
      .then((res) => setLessons(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta aula?")) return;
    setActionError("");
    try {
      await api.delete(`/lessons/${id}`);
      load();
    } catch (err) {
      setActionError(getErrorMessage(err, "Não foi possível excluir a aula."));
    }
  }

  async function handleEditValue(lesson: Lesson) {
    const novoValor = prompt("Novo valor da aula (R$):", lesson.professorValue);
    if (novoValor === null) return;
    const parsed = Number(novoValor.replace(",", "."));
    if (Number.isNaN(parsed)) return;
    setActionError("");
    try {
      await api.patch(`/lessons/${lesson.id}`, { professorValue: parsed });
      load();
    } catch (err) {
      setActionError(getErrorMessage(err, "Não foi possível editar a aula."));
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <p className="font-display font-semibold text-xl">Minhas aulas</p>
        <Link to="/aulas/nova" className="text-sm text-coral font-medium">
          + Nova
        </Link>
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
              Auxiliar: {lesson.assistant?.name ?? "—"} (
              {formatBRL(lesson.assistantValue)})
            </p>
            {lesson.observation && (
              <p className="text-xs text-ink-soft mt-1 italic">
                "{lesson.observation}"
              </p>
            )}

            <div className="flex gap-4 mt-3 pt-3 border-t border-black/5">
              <button
                onClick={() => handleEditValue(lesson)}
                className="text-xs font-medium text-teal"
              >
                Editar valor
              </button>
              <button
                onClick={() => handleDelete(lesson.id)}
                className="text-xs font-medium text-coral-dark"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
