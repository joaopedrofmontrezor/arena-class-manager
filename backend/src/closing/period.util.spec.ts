import { describe, it, expect } from '@jest/globals';
import { getPeriodoAtual } from './period.util';


describe('getPeriodoAtual', () => {
  it('dia 1 deve retornar periodo 01-15', () => {
    const p = getPeriodoAtual(new Date(2026, 8, 1)); 
    expect(p.start.getDate()).toBe(1);
    expect(p.end.getDate()).toBe(15);
  });

  it('dia 15 ainda deve estar no periodo 01-15', () => {
    const p = getPeriodoAtual(new Date(2026, 8, 15));
    expect(p.start.getDate()).toBe(1);
    expect(p.end.getDate()).toBe(15);
  });

  it('dia 16 deve virar para o periodo 16-fim do mes', () => {
    const p = getPeriodoAtual(new Date(2026, 8, 16)); 
    expect(p.start.getDate()).toBe(16);
    expect(p.end.getDate()).toBe(30);
  });

  it('mes com 31 dias deve fechar no dia 31', () => {
    const p = getPeriodoAtual(new Date(2026, 9, 20)); 
    expect(p.end.getDate()).toBe(31);
  });

  it('fevereiro em ano nao bissexto deve fechar no dia 28', () => {
    const p = getPeriodoAtual(new Date(2027, 1, 20)); 
    expect(p.end.getDate()).toBe(28);
  });

  it('fevereiro em ano bissexto deve fechar no dia 29', () => {
    const p = getPeriodoAtual(new Date(2028, 1, 20)); 
    expect(p.end.getDate()).toBe(29);
  });

  it('periodo nao deve vazar para o mes seguinte', () => {
    const p = getPeriodoAtual(new Date(2026, 8, 16));
    expect(p.end.getMonth()).toBe(8); 
  });
});
