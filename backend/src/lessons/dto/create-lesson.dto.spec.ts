import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateLessonDto } from "./create-lesson.dto";
import { VALOR_PERSONAL_MAXIMO } from "../lessons.constants";
import { describe, it, expect } from "@jest/globals";

function baseValida(): Partial<CreateLessonDto> {
  return {
    date: "2026-09-10",
    time: "18:00",
    type: "TURMA" as any,
    assistantId: "assistente-1",
  };
}

async function isValid(data: Partial<CreateLessonDto>): Promise<boolean> {
  const instance = plainToInstance(CreateLessonDto, data);
  const errors = await validate(instance);
  return errors.length === 0;
}

describe("CreateLessonDto - regras financeiras", () => {
  it("é válida uma aula TURMA sem professorValue informado", async () => {
    expect(await isValid(baseValida())).toBe(true);
  });

  it("é válida uma aula PERSONAL com professorValue positivo dentro do limite", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: 80,
      }),
    ).toBe(true);
  });

  it("rejeita professorValue igual a zero em uma aula PERSONAL", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: 0,
      }),
    ).toBe(false);
  });

  it("rejeita professorValue negativo em uma aula PERSONAL", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: -50,
      }),
    ).toBe(false);
  });

  it("rejeita professorValue com mais de duas casas decimais", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: 79.999,
      }),
    ).toBe(false);
  });

  it("aceita professorValue com exatamente duas casas decimais", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: 79.99,
      }),
    ).toBe(true);
  });

  it("rejeita professorValue acima do limite máximo configurado", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: VALOR_PERSONAL_MAXIMO + 0.01,
      }),
    ).toBe(false);
  });

  it("aceita professorValue exatamente no limite máximo configurado", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: VALOR_PERSONAL_MAXIMO,
      }),
    ).toBe(true);
  });

  it("rejeita um valor não-numérico em professorValue", async () => {
    expect(
      await isValid({
        ...baseValida(),
        type: "PERSONAL" as any,
        professorValue: "cinquenta" as any,
      }),
    ).toBe(false);
  });

  it("rejeita quando type não é um LessonType válido", async () => {
    expect(await isValid({ ...baseValida(), type: "INVALIDO" as any })).toBe(
      false,
    );
  });

  it("rejeita quando faltam campos obrigatórios (date, time)", async () => {
    expect(await isValid({ type: "TURMA" as any })).toBe(false);
  });

  it("é válida uma aula sem auxiliar (assistantId ausente ou null)", async () => {
    const { assistantId: _omitido, ...semAuxiliar } = baseValida();
    expect(await isValid(semAuxiliar)).toBe(true);
    expect(await isValid({ ...semAuxiliar, assistantId: null })).toBe(true);
  });
});
