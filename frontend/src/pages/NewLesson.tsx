import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Layout } from "../components/Layout";
import { LessonType, User } from "../types";

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

export function NewLesson() {
  const navigate = useNavigate();
  const [professors, setProfessors] = useState<User[]>([]);
  const [date, setDate] = useState(nowDate());
  const [time, setTime] = useState(nowTime());
  const [type, setType] = useState<LessonType>("TURMA");
  const [assistantId, setAssistantId] = useState("");
  const [professorValue, setProfessorValue] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    api.get<User[]>("/users", { params: { role: "PROFESSOR" } }).then((res) => {
      setProfessors(res.data);
      if (res.data.length > 0) setAssistantId(res.data[0].id);
    });
  }, []);

  function resetForKeepGoing() {
    setDate(nowDate());
    setTime(nowTime());
    setType("TURMA");
    setProfessorValue("");
    setObservation("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (type === "PERSONAL" && !professorValue) {
      setError("Informe o valor da aula particular.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/lessons", {
        date,
        time,
        type,
        assistantId,
        professorValue:
          type === "PERSONAL" ? Number(professorValue) : undefined,
        observation: observation || undefined,
      });
      setSavedMsg("Aula salva!");
      resetForKeepGoing();
      setTimeout(() => setSavedMsg(""), 2000);
    } catch {
      setError("Não foi possível salvar a aula. Tente novamente.");
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
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface"
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
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("TURMA")}
              className={`py-3.5 rounded-lg font-medium border-2 transition-colors ${
                type === "TURMA"
                  ? "border-coral bg-coral text-white"
                  : "border-black/10 bg-surface text-ink-soft"
              }`}
            >
              Turma
            </button>
            <button
              type="button"
              onClick={() => setType("PERSONAL")}
              className={`py-3.5 rounded-lg font-medium border-2 transition-colors ${
                type === "PERSONAL"
                  ? "border-coral bg-coral text-white"
                  : "border-black/10 bg-surface text-ink-soft"
              }`}
            >
              Personal
            </button>
          </div>
          <p className="text-xs text-ink-soft mt-2">
            {type === "TURMA"
              ? "Valor automático: R$ 28,00 (professor) + R$ 10,50 (auxiliar)"
              : "Auxiliar recebe R$ 10,50 automaticamente. Informe o valor da aula abaixo."}
          </p>
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
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface"
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
            required
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface"
          >
            {professors.map((p) => (
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
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 bg-surface"
            placeholder="Ex: reposição da aula de 10/09"
          />
        </div>

        {error && <p className="text-sm text-coral-dark">{error}</p>}
        {savedMsg && <p className="text-sm text-sea font-medium">{savedMsg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-coral text-white font-medium rounded-lg py-3.5 hover:bg-coral-dark transition-colors disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar aula"}
        </button>
      </form>
    </Layout>
  );
}
