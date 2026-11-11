export interface PeriodoExport {
  start: Date;
  end: Date;
  label: string;
}

export interface AulaExport {
  date: Date;
  time: string;
  type: string;
  professorValue: unknown;
  assistantValue: unknown;
  assistant?: { name: string } | null;
  professor?: { name: string } | null;
}

export interface PagamentoExport {
  pago: boolean;
  pagoEm: Date | null;
  valorPago: number | null;
}

export interface ResumoProfessorExport {
  periodo: PeriodoExport;
  totalTurmas: number;
  totalPersonais: number;
  valorAulas: number;
  valorComoAuxiliar: number;
  totalReceber: number;
  aulas: AulaExport[];
  aulasComoAuxiliar: AulaExport[];
  fechamento: PagamentoExport | null;
}

export interface ResumoGeralExport {
  periodo: PeriodoExport;
  professores: {
    professorId: string;
    nome: string;
    totalAulas: number;
    valorAulas: number;
    valorComoAuxiliar: number;
    totalReceber: number;
    pago: boolean;
    pagoEm: Date | null;
    valorPago: number | null;
  }[];
  totalGeralProfessor: number;
  totalGeralAuxiliares: number;
  totalGeral: number;
  fechamento: unknown | null;
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatadorDataSaoPaulo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor).replace(/[  ]/g, " ");
}

function dois(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatarDiaMes(data: Date): string {
  return `${dois(data.getUTCDate())}/${dois(data.getUTCMonth() + 1)}`;
}

export function formatarDataSaoPaulo(instante: Date): string {
  return formatadorDataSaoPaulo.format(instante);
}

export function rotuloPeriodo(periodo: PeriodoExport): string {
  return `${periodo.label} de ${periodo.start.getUTCFullYear()}`;
}

export function limparMarcacao(texto: string): string {
  return texto.replace(/[*_~`]/g, "").trim();
}

function rotuloTipo(tipo: string): string {
  return tipo === "PERSONAL" ? "Personal" : "Turma";
}

function linhaAula(aula: AulaExport, contraparte: string | null): string {
  const partes = [
    `${formatarDiaMes(aula.date)} ${aula.time}`,
    rotuloTipo(aula.type),
  ];
  return `• ${partes.join(" · ")}${contraparte ? ` · ${contraparte}` : ""}`;
}

function linhasComoProfessor(aulas: AulaExport[]): string[] {
  return aulas.map((a) => {
    const valor = formatarMoeda(Number(a.professorValue));
    const aux = a.assistant
      ? `aux.: ${limparMarcacao(a.assistant.name)}`
      : null;
    return `${linhaAula(a, null)} · ${valor}${aux ? ` · ${aux}` : ""}`;
  });
}

function linhasComoAuxiliar(aulas: AulaExport[]): string[] {
  return aulas.map((a) => {
    const valor = formatarMoeda(Number(a.assistantValue));
    const prof = a.professor
      ? `prof.: ${limparMarcacao(a.professor.name)}`
      : null;
    return `${linhaAula(a, null)} · ${valor}${prof ? ` · ${prof}` : ""}`;
  });
}

function linhaStatusProfessor(fechamento: PagamentoExport | null): string {
  if (!fechamento) return "Status: período em aberto";
  if (!fechamento.pago)
    return "Status: 🔒 período fechado, aguardando pagamento";
  const quando = fechamento.pagoEm
    ? ` em ${formatarDataSaoPaulo(fechamento.pagoEm)}`
    : "";
  const valor =
    fechamento.valorPago !== null
      ? ` · ${formatarMoeda(fechamento.valorPago)}`
      : "";
  return `Status: ✅ pago${quando}${valor}`;
}

function blocoDeAulas(resumo: ResumoProfessorExport): string[] {
  const linhas: string[] = [];
  const qtdAulas = resumo.totalTurmas + resumo.totalPersonais;

  if (resumo.aulas.length === 0 && resumo.aulasComoAuxiliar.length === 0) {
    linhas.push("Nenhuma aula neste período.");
    return linhas;
  }

  if (resumo.aulas.length > 0) {
    linhas.push(
      `*Como professor* — ${qtdAulas} ${qtdAulas === 1 ? "aula" : "aulas"} · ${formatarMoeda(resumo.valorAulas)}`,
    );
    linhas.push(...linhasComoProfessor(resumo.aulas));
  }

  if (resumo.aulasComoAuxiliar.length > 0) {
    if (linhas.length > 0) linhas.push("");
    linhas.push(`*Como auxiliar* — ${formatarMoeda(resumo.valorComoAuxiliar)}`);
    linhas.push(...linhasComoAuxiliar(resumo.aulasComoAuxiliar));
  }

  return linhas;
}

export function formatarFechamentoProfessor(
  nome: string,
  resumo: ResumoProfessorExport,
): string {
  return [
    `*Fechamento — ${limparMarcacao(nome)}*`,
    `Período: ${rotuloPeriodo(resumo.periodo)}`,
    "",
    `*Total a receber: ${formatarMoeda(resumo.totalReceber)}*`,
    "",
    ...blocoDeAulas(resumo),
    "",
    linhaStatusProfessor(resumo.fechamento),
  ].join("\n");
}

function marcaPagamentoGeral(
  periodoFechado: boolean,
  p: { pago: boolean; pagoEm: Date | null },
): string {
  if (!periodoFechado) return "";
  if (!p.pago) return " ⏳ a pagar";
  return p.pagoEm
    ? ` ✅ pago em ${formatarDataSaoPaulo(p.pagoEm)}`
    : " ✅ pago";
}

export function formatarFechamentoGeral(
  resumo: ResumoGeralExport,
  detalhes: { professorId: string; resumo: ResumoProfessorExport }[],
): string {
  const periodoFechado = Boolean(resumo.fechamento);
  const detalhePorId = new Map(detalhes.map((d) => [d.professorId, d.resumo]));

  const linhas: string[] = [
    "*Fechamento geral*",
    `Período: ${rotuloPeriodo(resumo.periodo)}`,
    periodoFechado ? "Status: 🔒 período fechado" : "Status: período em aberto",
    `Total geral: *${formatarMoeda(resumo.totalGeral)}* (professores ${formatarMoeda(resumo.totalGeralProfessor)} · auxiliares ${formatarMoeda(resumo.totalGeralAuxiliares)})`,
  ];

  if (resumo.professores.length === 0) {
    linhas.push("", "Nenhuma movimentação neste período.");
    return linhas.join("\n");
  }

  for (const p of resumo.professores) {
    linhas.push(
      "",
      "──────────",
      `*${limparMarcacao(p.nome)}* — *${formatarMoeda(p.totalReceber)}*${marcaPagamentoGeral(periodoFechado, p)}`,
    );
    const detalhe = detalhePorId.get(p.professorId);
    if (detalhe) linhas.push(...blocoDeAulas(detalhe));
  }

  return linhas.join("\n");
}
