import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Modal } from "./Modal";
import { Lesson, LessonType, User } from "../types";

const SEM_AUXILIAR = "NONE";

const inputClass =
  "w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface";

interface Props {
  lesson: Lesson;

  aviso?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditLessonModal({ lesson, aviso, onClose, onSaved }: Props) {
  const [professors, setProfessors] = useState<User[]>([]);
  const [date, setDate] = useState(lesson.date.slice(0, 10));
  const [time, setTime] = useState(lesson.time);
  const [type, setType] = useState<LessonType>(lesson.type);
  const [professorValue, setProfessorValue] = useState(
    lesson.type === "PERSONAL" ? String(Number(lesson.professorValue)) : "",
  );
  const [assistantId, setAssistantId] = useState(
    lesson.assistantId ?? SEM_AUXILIAR,
  );
  const [observation, setObservation] = useState(lesson.observation ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<User[]>("/users").then((res) => setProfessors(res.data));
  }, []);

  const auxiliares = professors.filter((p) => p.id !== lesson.professorId);

  const auxiliarAtualForaDaLista =
    lesson.assistant &&
    lesson.assistantId &&
    !auxiliares.some((p) => p.id === lesson.assistantId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    let valor: number | undefined;
    if (type === "PERSONAL") {
      valor = Number(professorValue.replace(",", "."));
      if (!valor || valor <= 0) {
        setError("Informe o valor da aula particular.");
        return;
      }
    }

    setSaving(true);
    try {
      await api.patch(`/lessons/${lesson.id}`, {
        date,
        time,
        type,
        professorValue: valor,
        assistantId: assistantId === SEM_AUXILIAR ? null : assistantId,
        observation,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível salvar a aula."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar aula" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {aviso && (
          <p className="text-xs bg-sand rounded-lg px-3 py-2 text-ink">
            {aviso}
          </p>
        )}

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
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className={inputClass}
            />
          </div>
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
                onClick={() => setType(tipo)}
                className={`py-3 rounded-lg font-medium border-2 transition-colors ${
                  type === tipo
                    ? "border-coral bg-coral text-white"
                    : "border-black/10 bg-surface text-ink-soft"
                }`}
              >
                {tipo === "TURMA" ? "Turma" : "Personal"}
              </button>
            ))}
          </div>
          {type === "TURMA" && (
            <p className="text-xs text-ink-soft mt-2">
              Valor automático: R$ 28,00 (professor)
            </p>
          )}
        </div>

        {type === "PERSONAL" && (
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Valor da aula (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={professorValue}
              onChange={(e) => setProfessorValue(e.target.value)}
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
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            className={inputClass}
          >
            <option value={SEM_AUXILIAR}>Sem auxiliar</option>
            {auxiliarAtualForaDaLista && lesson.assistant && (
              <option value={lesson.assistant.id}>
                {lesson.assistant.name} (inativo)
              </option>
            )}
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
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-coral-dark">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-black/10 text-ink-soft font-medium rounded-lg py-3"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-coral text-white font-medium rounded-lg py-3 hover:bg-coral-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
