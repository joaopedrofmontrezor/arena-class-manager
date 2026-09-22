import { describe, it, expect } from "@jest/globals";
import { getPeriodoAtual } from "./period.util";

function dataUtc(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes, dia));
}

describe("getPeriodoAtual", () => {
  it("dia 1 deve retornar periodo 01-15", () => {
    const p = getPeriodoAtual(dataUtc(2026, 8, 1));
    expect(p.start.getUTCDate()).toBe(1);
    expect(p.end.getUTCDate()).toBe(15);
  });

  it("dia 15 ainda deve estar no periodo 01-15", () => {
    const p = getPeriodoAtual(dataUtc(2026, 8, 15));
    expect(p.start.getUTCDate()).toBe(1);
    expect(p.end.getUTCDate()).toBe(15);
  });

  it("dia 16 deve virar para o periodo 16-fim do mes", () => {
    const p = getPeriodoAtual(dataUtc(2026, 8, 16));
    expect(p.start.getUTCDate()).toBe(16);
    expect(p.end.getUTCDate()).toBe(30);
  });

  it("mes com 31 dias deve fechar no dia 31", () => {
    const p = getPeriodoAtual(dataUtc(2026, 9, 20));
    expect(p.end.getUTCDate()).toBe(31);
  });

  it("fevereiro em ano nao bissexto deve fechar no dia 28", () => {
    const p = getPeriodoAtual(dataUtc(2027, 1, 20));
    expect(p.end.getUTCDate()).toBe(28);
  });

  it("fevereiro em ano bissexto deve fechar no dia 29", () => {
    const p = getPeriodoAtual(dataUtc(2028, 1, 20));
    expect(p.end.getUTCDate()).toBe(29);
  });

  it("periodo nao deve vazar para o mes seguinte", () => {
    const p = getPeriodoAtual(dataUtc(2026, 8, 16));
    expect(p.end.getUTCMonth()).toBe(8);
  });

  it("resultado independe do fuso horario configurado no processo (TZ)", () => {
    const tzOriginal = process.env.TZ;
    process.env.TZ = "UTC";
    const p1 = getPeriodoAtual(dataUtc(2026, 8, 16));
    process.env.TZ = "America/Sao_Paulo";
    const p2 = getPeriodoAtual(dataUtc(2026, 8, 16));
    process.env.TZ = tzOriginal;

    expect(p1.start.toISOString()).toBe(p2.start.toISOString());
    expect(p1.end.toISOString()).toBe(p2.end.toISOString());
  });
});
