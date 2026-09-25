import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { PeriodoQueryDto } from "./periodo-query.dto";
import { describe, it, expect } from "@jest/globals";


async function isValid(data: Partial<PeriodoQueryDto>): Promise<boolean> {
  const instance = plainToInstance(PeriodoQueryDto, data);
  const errors = await validate(instance);
  return errors.length === 0;
}

describe("PeriodoQueryDto", () => {
  it("é válido sem start nem end (usa o período atual)", async () => {
    expect(await isValid({})).toBe(true);
  });

  it("é válido com start e end no formato certo e start <= end", async () => {
    expect(await isValid({ start: "2026-09-01", end: "2026-09-15" })).toBe(true);
    expect(await isValid({ start: "2026-09-01", end: "2026-09-01" })).toBe(true);
  });

  it("rejeita quando start vem sem end", async () => {
    expect(await isValid({ start: "2026-09-01" })).toBe(false);
  });

  it("rejeita quando end vem sem start", async () => {
    expect(await isValid({ end: "2026-09-15" })).toBe(false);
  });

  it("rejeita quando start é depois de end", async () => {
    expect(await isValid({ start: "2026-09-20", end: "2026-09-10" })).toBe(false);
  });

  it("rejeita datas em formato inválido", async () => {
    expect(await isValid({ start: "01/09/2026", end: "15/09/2026" })).toBe(false);
    expect(await isValid({ start: "lalala", end: "2026-09-15" })).toBe(false);
  });
});
