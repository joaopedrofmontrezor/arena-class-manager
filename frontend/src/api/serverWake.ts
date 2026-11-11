export const MOSTRAR_APOS_MS = 4000;

type Ouvinte = () => void;

let pendentes = 0;
let acordando = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const ouvintes = new Set<Ouvinte>();

function definir(valor: boolean) {
  if (acordando === valor) return;
  acordando = valor;
  ouvintes.forEach((o) => o());
}

export function requisicaoIniciada(): void {
  pendentes += 1;
  if (pendentes === 1 && !acordando && timer === null) {
    timer = setTimeout(() => {
      timer = null;
      if (pendentes > 0) definir(true);
    }, MOSTRAR_APOS_MS);
  }
}

export function requisicaoFinalizada(): void {
  pendentes = Math.max(0, pendentes - 1);
  if (pendentes === 0) {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    definir(false);
  }
}

export function estaAcordando(): boolean {
  return acordando;
}

export function assinar(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function reiniciar(): void {
  pendentes = 0;
  acordando = false;
  if (timer !== null) clearTimeout(timer);
  timer = null;
  ouvintes.clear();
}
