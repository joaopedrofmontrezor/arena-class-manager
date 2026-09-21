export interface Periodo {
  start: Date;
  end: Date;
  label: string;
}

export function getPeriodoAtual(referencia: Date = new Date()): Periodo {
  const dia = referencia.getDate();
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();

  const nomeMes = referencia.toLocaleString("pt-BR", { month: "long" });

  if (dia <= 15) {
    return {
      start: new Date(ano, mes, 1, 0, 0, 0, 0),
      end: new Date(ano, mes, 15, 23, 59, 59, 999),
      label: `01 a 15 de ${nomeMes}`,
    };
  }

  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return {
    start: new Date(ano, mes, 16, 0, 0, 0, 0),
    end: new Date(ano, mes, ultimoDia, 23, 59, 59, 999),
    label: `16 a ${ultimoDia} de ${nomeMes}`,
  };
}
