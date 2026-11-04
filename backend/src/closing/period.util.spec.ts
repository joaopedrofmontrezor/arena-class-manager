import { describe, it, expect } from "@jest/globals";
import { getPeriodoAtual, periodoJaEncerrado } from "./period.util";

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

describe("periodoJaEncerrado", () => {
  const primeiraQuinzenaSetembro = getPeriodoAtual(dataUtc(2026, 8, 1));

  it("é falso durante o próprio período", () => {
    expect(
      periodoJaEncerrado(
        primeiraQuinzenaSetembro,
        new Date("2026-09-10T15:00:00Z"),
      ),
    ).toBe(false);
  });

  it("é falso no último dia do período (ainda dá para lançar aulas)", () => {
    expect(
      periodoJaEncerrado(
        primeiraQuinzenaSetembro,
        new Date("2026-09-15T15:00:00Z"),
      ),
    ).toBe(false);
  });

  it("é verdadeiro a partir do dia seguinte ao fim", () => {
    expect(
      periodoJaEncerrado(
        primeiraQuinzenaSetembro,
        new Date("2026-09-16T15:00:00Z"),
      ),
    ).toBe(true);
  });

  it("usa o dia de São Paulo, não o de UTC (02:00Z do dia 16 ainda é dia 15 no Brasil)", () => {
    expect(
      periodoJaEncerrado(
        primeiraQuinzenaSetembro,
        new Date("2026-09-16T02:00:00Z"),
      ),
    ).toBe(false);
  });

  it("é falso para um período futuro", () => {
    expect(
      periodoJaEncerrado(
        primeiraQuinzenaSetembro,
        new Date("2026-08-01T12:00:00Z"),
      ),
    ).toBe(false);
  });

  it("funciona na virada de ano (16 a 31 de dezembro encerra em janeiro)", () => {
    const dezembro = getPeriodoAtual(dataUtc(2026, 11, 20));
    expect(periodoJaEncerrado(dezembro, new Date("2026-12-31T15:00:00Z"))).toBe(
      false,
    );
    expect(periodoJaEncerrado(dezembro, new Date("2027-01-01T15:00:00Z"))).toBe(
      true,
    );
  });
});
