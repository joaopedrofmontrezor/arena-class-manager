import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { LessonType, User } from "../types";


const VALOR_TURMA_PROFESSOR = 28;
const VALOR_AUXILIAR = 10.5;
const MAX_AULAS_POR_DIA = 10;


const SEM_AUXILIAR = "NONE";

interface LessonDraft {
  time: string;
  type: LessonType;
  professorValue: string;
  assistantId: string;
  observation: string;
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function novaAula(time: string): LessonDraft {
  return {
    time,
    type: "TURMA",
    professorValue: "",
    assistantId: "",
    observation: "",
  };
}

const inputClass =
  "w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface";

export function NewLesson() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [professors, setProfessors] = useState<User[]>([]);
  const [date, setDate] = useState(nowDate());
  const [lessons, setLessons] = useState<LessonDraft[]>(() => [
    novaAula(nowTime()),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<User[]>("/users").then((res) => setProfessors(res.data));
  }, []);

  
  const auxiliares = professors.filter((p) => p.id !== user?.id);

  function setQuantity(next: number) {
    const qtd = Math.min(MAX_AULAS_POR_DIA, Math.max(1, next));
    setLessons((atual) => {
      if (qtd <= atual.length) return atual.slice(0, qtd);
      const ultimoHorario = atual[atual.length - 1]?.time ?? nowTime();
      const extras = Array.from({ length: qtd - atual.length }, () =>
        novaAula(ultimoHorario),
      );
      return [...atual, ...extras];
    });
  }

  function updateLesson(index: number, patch: Partial<LessonDraft>) {
    setLessons((atual) =>
      atual.map((aula, i) => (i === index ? { ...aula, ...patch } : aula)),
    );
  }

  const totalProfessor = lessons.reduce((soma, aula) => {
    if (aula.type === "TURMA") return soma + VALOR_TURMA_PROFESSOR;
    return soma + (Number(aula.professorValue.replace(",", ".")) || 0);
  }, 0);

  const totalAuxiliares = lessons.filter(
    (aula) => aula.assistantId && aula.assistantId !== SEM_AUXILIAR,
  ).length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    for (let i = 0; i < lessons.length; i++) {
      const aula = lessons[i];
      const rotulo = `Aula ${i + 1}`;

      if (!aula.time) {
        setError(`${rotulo}: informe o horário.`);
        return;
      }
      if (aula.type === "PERSONAL") {
        const valor = Number(aula.professorValue.replace(",", "."));
        if (!valor || valor <= 0) {
          setError(`${rotulo}: informe o valor da aula particular.`);
          return;
        }
      }
      if (!aula.assistantId) {
        setError(
          `${rotulo}: escolha o auxiliar (ou "Sem auxiliar" se não teve).`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      await api.post("/lessons/batch", {
        date,
        lessons: lessons.map((aula) => ({
          time: aula.time,
          type: aula.type,
          assistantId:
            aula.assistantId === SEM_AUXILIAR ? null : aula.assistantId,
          professorValue:
            aula.type === "PERSONAL"
              ? Number(aula.professorValue.replace(",", "."))
              : undefined,
          observation: aula.observation || undefined,
        })),
      });

      navigate("/dashboard", { state: { aulaSalva: true } });
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível salvar as aulas."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <p className="font-display font-semibold text-xl">Nova aula</p>
        <button
          onClick={() => navigate("/aulas")}
          className="text-sm text-ink-soft"
        >
          Ver aulas
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Quantidade de aulas
            </label>
            <div className="flex items-center border border-black/10 rounded-lg bg-surface">
              <button
                type="button"
                onClick={() => setQuantity(lessons.length - 1)}
                disabled={lessons.length <= 1}
                aria-label="Diminuir quantidade de aulas"
                className="px-4 py-2.5 text-lg font-medium text-ink-soft disabled:opacity-30"
              >
                −
              </button>
              <span className="flex-1 text-center font-display font-semibold text-lg">
                {lessons.length}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(lessons.length + 1)}
                disabled={lessons.length >= MAX_AULAS_POR_DIA}
                aria-label="Aumentar quantidade de aulas"
                className="px-4 py-2.5 text-lg font-medium text-coral disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {lessons.map((aula, index) => (
          <div
            key={index}
            className="bg-surface rounded-card p-4 space-y-4 border border-black/5"
          >
            <p className="font-display font-semibold">Aula {index + 1}</p>

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">
                Horário
              </label>
              <input
                type="time"
                value={aula.time}
                onChange={(e) => updateLesson(index, { time: e.target.value })}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Tipo
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["TURMA", "PERSONAL"] as LessonType[]).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => updateLesson(index, { type: tipo })}
                    className={`py-3 rounded-lg font-medium border-2 transition-colors ${
                      aula.type === tipo
                        ? "border-coral bg-coral text-white"
                        : "border-black/10 bg-surface text-ink-soft"
                    }`}
                  >
                    {tipo === "TURMA" ? "Turma" : "Personal"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-2">
                {aula.type === "TURMA"
                  ? "Valor automático: R$ 28,00 (professor) + R$ 10,50 (auxiliar, se houver)"
                  : "Auxiliar (se houver) recebe R$ 10,50. Informe o valor da aula abaixo."}
              </p>
            </div>

            {aula.type === "PERSONAL" && (
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  Valor da aula (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={aula.professorValue}
                  onChange={(e) =>
                    updateLesson(index, { professorValue: e.target.value })
                  }
                  required
                  className={inputClass}
                  placeholder="60.00"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">
                Auxiliar
              </label>
              <select
                value={aula.assistantId}
                onChange={(e) =>
                  updateLesson(index, { assistantId: e.target.value })
                }
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                <option value={SEM_AUXILIAR}>Sem auxiliar</option>
                {auxiliares.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">
                Observação (opcional)
              </label>
              <input
                type="text"
                value={aula.observation}
                onChange={(e) =>
                  updateLesson(index, { observation: e.target.value })
                }
                className={inputClass}
                placeholder="Ex: reposição da aula de 10/09"
              />
            </div>
          </div>
        ))}

        <div className="bg-sand rounded-card p-4 text-sm">
          <p className="font-medium">
            {lessons.length} {lessons.length === 1 ? "aula" : "aulas"} · você
            recebe {formatBRL(totalProfessor)}
          </p>
          <p className="text-xs text-ink-soft mt-1">
            {totalAuxiliares === 0
              ? "Nenhum auxiliar neste dia."
              : `${totalAuxiliares} ${
                  totalAuxiliares === 1 ? "auxiliar" : "auxiliares"
                } × ${formatBRL(VALOR_AUXILIAR)} = ${formatBRL(
                  totalAuxiliares * VALOR_AUXILIAR,
                )} (pago aos auxiliares)`}
          </p>
        </div>

        {error && <p className="text-sm text-coral-dark">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-coral text-white font-medium rounded-lg py-3.5 hover:bg-coral-dark transition-colors disabled:opacity-60"
        >
          {saving
            ? "Salvando..."
            : lessons.length === 1
              ? "Salvar aula"
              : `Salvar ${lessons.length} aulas`}
        </button>
      </form>
    </Layout>
  );
}
