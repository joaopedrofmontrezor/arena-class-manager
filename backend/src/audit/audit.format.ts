import { formatarMoeda } from "../closing/closing-export.formatter";

// "type" (e não "interface") de propósito: o Prisma só aceita gravar em coluna
// Json objetos com assinatura de índice, e interfaces não têm.
export type AlteracaoCampo = {
  campo: string;
  de: string;
  para: string;
};

export interface AulaSnapshot {
  date: Date;
  time: string;
  type: string;
  professorValue: unknown;
  assistantId: string | null;
  observation: string | null;
}

export function formatarData(data: Date): string {
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getUTCFullYear()}`;
}

export function rotuloTipo(tipo: string): string {
  return tipo === "PERSONAL" ? "Personal" : "Turma";
}

const SEM_AUXILIAR = "sem auxiliar";
const SEM_OBSERVACAO = "(vazia)";

function texto(valor: string | null | undefined): string {
  return (valor ?? "").trim();
}

/**
 * Compara a aula antes e depois e devolve só o que mudou, já em texto
 * pronto para exibir. Lista vazia = nada mudou (não precisa registrar).
 */
export function diffAula(
  antes: AulaSnapshot,
  depois: AulaSnapshot,
  nomeAuxiliar: (id: string | null) => string,
): AlteracaoCampo[] {
  const mudancas: AlteracaoCampo[] = [];

  if (antes.date.getTime() !== depois.date.getTime()) {
    mudancas.push({
      campo: "Data",
      de: formatarData(antes.date),
      para: formatarData(depois.date),
    });
  }
  if (antes.time !== depois.time) {
    mudancas.push({ campo: "Horário", de: antes.time, para: depois.time });
  }
  if (antes.type !== depois.type) {
    mudancas.push({
      campo: "Tipo",
      de: rotuloTipo(antes.type),
      para: rotuloTipo(depois.type),
    });
  }
  if (Number(antes.professorValue) !== Number(depois.professorValue)) {
    mudancas.push({
      campo: "Valor do professor",
      de: formatarMoeda(Number(antes.professorValue)),
      para: formatarMoeda(Number(depois.professorValue)),
    });
  }
  if (antes.assistantId !== depois.assistantId) {
    mudancas.push({
      campo: "Auxiliar",
      de: nomeAuxiliar(antes.assistantId),
      para: nomeAuxiliar(depois.assistantId),
    });
  }
  if (texto(antes.observation) !== texto(depois.observation)) {
    mudancas.push({
      campo: "Observação",
      de: texto(antes.observation) || SEM_OBSERVACAO,
      para: texto(depois.observation) || SEM_OBSERVACAO,
    });
  }

  return mudancas;
}

export { SEM_AUXILIAR };
