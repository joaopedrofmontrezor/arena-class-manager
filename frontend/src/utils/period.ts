export interface Periodo {
  start: Date;
  end: Date;
  label: string;
}

const NOMES_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function dataCalendario(
  ano: number,
  mes: number,
  dia: number,
  h = 0,
  m = 0,
  s = 0,
  ms = 0,
): Date {
  return new Date(Date.UTC(ano, mes, dia, h, m, s, ms));
}

function hojeEmSaoPaulo(): { ano: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)!.value);
  return { ano: valor("year"), mes: valor("month") - 1, dia: valor("day") };
}

export function getPeriodoDe(ano: number, mes: number, dia: number): Periodo {
  const nomeMes = NOMES_MESES[mes];

  if (dia <= 15) {
    return {
      start: dataCalendario(ano, mes, 1),
      end: dataCalendario(ano, mes, 15, 23, 59, 59, 999),
      label: `01 a 15 de ${nomeMes}`,
    };
  }

  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return {
    start: dataCalendario(ano, mes, 16),
    end: dataCalendario(ano, mes, ultimoDia, 23, 59, 59, 999),
    label: `16 a ${ultimoDia} de ${nomeMes}`,
  };
}

export function getPeriodoAtual(): Periodo {
  const { ano, mes, dia } = hojeEmSaoPaulo();
  return getPeriodoDe(ano, mes, dia);
}

export function getPeriodoAnterior(atual: Periodo): Periodo {
  const diaAnterior = new Date(atual.start.getTime() - 24 * 60 * 60 * 1000);
  return getPeriodoDe(
    diaAnterior.getUTCFullYear(),
    diaAnterior.getUTCMonth(),
    diaAnterior.getUTCDate(),
  );
}

export function getProximoPeriodo(atual: Periodo): Periodo {
  const diaSeguinte = new Date(atual.end.getTime() + 24 * 60 * 60 * 1000);
  return getPeriodoDe(
    diaSeguinte.getUTCFullYear(),
    diaSeguinte.getUTCMonth(),
    diaSeguinte.getUTCDate(),
  );
}

export function toQueryDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
