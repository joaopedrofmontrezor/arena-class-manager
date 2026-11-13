import { describe, it, expect } from "@jest/globals";
import {
  AulaSnapshot,
  diffAula,
  formatarData,
  rotuloTipo,
} from "./audit.format";

const base: AulaSnapshot = {
  date: new Date("2026-11-10T00:00:00.000Z"),
  time: "17:00",
  type: "TURMA",
  professorValue: "28",
  assistantId: null,
  observation: null,
};

const nome = (id: string | null) => (id ? `Nome-${id}` : "sem auxiliar");

describe("audit.format", () => {
  it("formatarData usa o dia do calendário gravado (UTC)", () => {
    expect(formatarData(new Date("2026-01-05T00:00:00.000Z"))).toBe(
      "05/01/2026",
    );
  });

  it("rotuloTipo", () => {
    expect(rotuloTipo("PERSONAL")).toBe("Personal");
    expect(rotuloTipo("TURMA")).toBe("Turma");
  });

  describe("diffAula", () => {
    it("nada mudou: lista vazia (inclui Decimal como string vs número)", () => {
      expect(
        diffAula(base, { ...base, professorValue: 28 }, nome),
      ).toEqual([]);
    });

    it("horário", () => {
      expect(diffAula(base, { ...base, time: "18:00" }, nome)).toEqual([
        { campo: "Horário", de: "17:00", para: "18:00" },
      ]);
    });

    it("data", () => {
      expect(
        diffAula(
          base,
          { ...base, date: new Date("2026-11-12T00:00:00.000Z") },
          nome,
        ),
      ).toEqual([{ campo: "Data", de: "10/11/2026", para: "12/11/2026" }]);
    });

    it("tipo e valor, com moeda formatada", () => {
      expect(
        diffAula(base, { ...base, type: "PERSONAL", professorValue: "52" }, nome),
      ).toEqual([
        { campo: "Tipo", de: "Turma", para: "Personal" },
        { campo: "Valor do professor", de: "R$ 28,00", para: "R$ 52,00" },
      ]);
    });

    it("auxiliar: mostra nomes, e 'sem auxiliar' quando não há", () => {
      expect(
        diffAula(base, { ...base, assistantId: "b" }, nome),
      ).toEqual([{ campo: "Auxiliar", de: "sem auxiliar", para: "Nome-b" }]);
      expect(
        diffAula({ ...base, assistantId: "b" }, { ...base, assistantId: "c" }, nome),
      ).toEqual([{ campo: "Auxiliar", de: "Nome-b", para: "Nome-c" }]);
    });

    it("observação: null, vazio e só espaços contam como a mesma coisa", () => {
      expect(diffAula(base, { ...base, observation: "" }, nome)).toEqual([]);
      expect(diffAula(base, { ...base, observation: "   " }, nome)).toEqual([]);
    });

    it("observação: mostra (vazia) quando não havia texto", () => {
      expect(
        diffAula(base, { ...base, observation: "trazer bolas" }, nome),
      ).toEqual([
        { campo: "Observação", de: "(vazia)", para: "trazer bolas" },
      ]);
    });

    it("vários campos de uma vez, na ordem fixa", () => {
      const r = diffAula(
        base,
        { ...base, time: "18:00", observation: "x", professorValue: 30 },
        nome,
      );
      expect(r.map((c) => c.campo)).toEqual([
        "Horário",
        "Valor do professor",
        "Observação",
      ]);
    });
  });
});
