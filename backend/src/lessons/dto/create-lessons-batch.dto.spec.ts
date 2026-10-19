import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CreateLessonsBatchDto,
  MAX_AULAS_POR_LOTE,
} from "./create-lessons-batch.dto";
import { describe, it, expect } from "@jest/globals";

async function isValid(data: unknown): Promise<boolean> {
  const instance = plainToInstance(CreateLessonsBatchDto, data);
  const errors = await validate(instance);
  return errors.length === 0;
}

const turma = { time: "18:00", type: "TURMA" };

describe("CreateLessonsBatchDto", () => {
  it("aceita um dia com várias aulas, com e sem auxiliar", async () => {
    expect(
      await isValid({
        date: "2026-09-10",
        lessons: [
          { ...turma, assistantId: "aux-1" },
          { ...turma, time: "19:00", assistantId: null },
          { time: "20:00", type: "PERSONAL", professorValue: 70 },
        ],
      }),
    ).toBe(true);
  });

  it("rejeita lote vazio", async () => {
    expect(await isValid({ date: "2026-09-10", lessons: [] })).toBe(false);
  });

  it("rejeita lote acima do máximo", async () => {
    const lessons = Array.from({ length: MAX_AULAS_POR_LOTE + 1 }, () => turma);
    expect(await isValid({ date: "2026-09-10", lessons })).toBe(false);
  });

  it("rejeita data inválida", async () => {
    expect(await isValid({ date: "2026-02-30", lessons: [turma] })).toBe(
      false,
    );
  });

  it("valida cada item: PERSONAL sem valor é rejeitado", async () => {
    expect(
      await isValid({
        date: "2026-09-10",
        lessons: [turma, { time: "19:00", type: "PERSONAL" }],
      }),
    ).toBe(false);
  });

  it("valida cada item: horário inválido é rejeitado", async () => {
    expect(
      await isValid({
        date: "2026-09-10",
        lessons: [{ time: "25:99", type: "TURMA" }],
      }),
    ).toBe(false);
  });
});
