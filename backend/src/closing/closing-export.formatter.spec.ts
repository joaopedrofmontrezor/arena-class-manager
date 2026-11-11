import { describe, it, expect } from "@jest/globals";
import {
  AulaExport,
  formatarDataSaoPaulo,
  formatarDiaMes,
  formatarFechamentoGeral,
  formatarFechamentoProfessor,
  formatarMoeda,
  limparMarcacao,
  ResumoGeralExport,
  ResumoProfessorExport,
  rotuloPeriodo,
} from "./closing-export.formatter";

const PERIODO = {
  start: new Date("2026-10-16T00:00:00.000Z"),
  end: new Date("2026-10-31T23:59:59.999Z"),
  label: "16 a 31 de outubro",
};

function aula(parcial: Partial<AulaExport> = {}): AulaExport {
  return {
    date: new Date("2026-10-17T00:00:00.000Z"),
    time: "18:00",
    type: "TURMA",
    professorValue: 28,
    assistantValue: 0,
    assistant: null,
    professor: null,
    ...parcial,
  };
}

function resumo(
  parcial: Partial<ResumoProfessorExport> = {},
): ResumoProfessorExport {
  return {
    periodo: PERIODO,
    totalTurmas: 1,
    totalPersonais: 0,
    valorAulas: 28,
    valorComoAuxiliar: 0,
    totalReceber: 28,
    aulas: [aula()],
    aulasComoAuxiliar: [],
    fechamento: null,
    ...parcial,
  };
}

describe("formatarMoeda", () => {
  it("usa o padrão brasileiro com espaço comum (sem espaço especial)", () => {
    expect(formatarMoeda(28)).toBe("R$ 28,00");
    expect(formatarMoeda(10.5)).toBe("R$ 10,50");
  });

  it("separa os milhares com ponto", () => {
    expect(formatarMoeda(1234.5)).toBe("R$ 1.234,50");
  });

  it("não contém espaço sem quebra (U+00A0) que atrapalha a cópia", () => {
    expect(formatarMoeda(1234.5)).not.toMatch(/[  ]/);
  });

  it("zero vira R$ 0,00", () => {
    expect(formatarMoeda(0)).toBe("R$ 0,00");
  });
});

describe("datas", () => {
  it("aula: mostra o dia do calendário gravado, sem deslocar por fuso", () => {
    expect(formatarDiaMes(new Date("2026-10-05T00:00:00.000Z"))).toBe("05/10");
    expect(formatarDiaMes(new Date("2026-01-31T00:00:00.000Z"))).toBe("31/01");
  });

  it("pagamento: usa o dia de São Paulo (02:00Z ainda é o dia anterior no Brasil)", () => {
    expect(formatarDataSaoPaulo(new Date("2026-11-01T02:00:00.000Z"))).toBe(
      "31/10/2026",
    );
    expect(formatarDataSaoPaulo(new Date("2026-11-01T15:00:00.000Z"))).toBe(
      "01/11/2026",
    );
  });

  it("o período ganha o ano", () => {
    expect(rotuloPeriodo(PERIODO)).toBe("16 a 31 de outubro de 2026");
  });
});

describe("limparMarcacao", () => {
  it("remove os caracteres de formatação do WhatsApp", () => {
    expect(limparMarcacao("Ana *Maria* _Souza_ ~x~ `y`")).toBe(
      "Ana Maria Souza x y",
    );
  });

  it("não mexe em nomes normais (acentos e espaços)", () => {
    expect(limparMarcacao("José da Conceição")).toBe("José da Conceição");
  });
});

describe("formatarFechamentoProfessor", () => {
  it("traz título, período, total e a lista de aulas", () => {
    const texto = formatarFechamentoProfessor("Ana Souza", resumo());

    expect(texto).toContain("*Fechamento — Ana Souza*");
    expect(texto).toContain("Período: 16 a 31 de outubro de 2026");
    expect(texto).toContain("*Total a receber: R$ 28,00*");
    expect(texto).toContain("*Como professor* — 1 aula · R$ 28,00");
    expect(texto).toContain("• 17/10 18:00 · Turma · R$ 28,00");
  });

  it("singular e plural de aula", () => {
    expect(
      formatarFechamentoProfessor("A", resumo({ totalTurmas: 1 })),
    ).toContain("1 aula ·");
    expect(
      formatarFechamentoProfessor(
        "A",
        resumo({ totalTurmas: 2, aulas: [aula(), aula()] }),
      ),
    ).toContain("2 aulas ·");
  });

  it("mostra o auxiliar na aula, quando há", () => {
    const texto = formatarFechamentoProfessor(
      "Ana",
      resumo({ aulas: [aula({ assistant: { name: "Bruno Lima" } })] }),
    );
    expect(texto).toContain("• 17/10 18:00 · Turma · R$ 28,00 · aux.: Bruno Lima");
  });

  it("personal mostra o valor próprio e o tipo", () => {
    const texto = formatarFechamentoProfessor(
      "Ana",
      resumo({
        totalTurmas: 0,
        totalPersonais: 1,
        valorAulas: 52,
        totalReceber: 52,
        aulas: [aula({ type: "PERSONAL", professorValue: 52 })],
      }),
    );
    expect(texto).toContain("• 17/10 18:00 · Personal · R$ 52,00");
  });

  it("seção de auxiliar usa o valor de auxiliar e o nome do professor", () => {
    const texto = formatarFechamentoProfessor(
      "Ana",
      resumo({
        valorComoAuxiliar: 10.5,
        totalReceber: 38.5,
        aulasComoAuxiliar: [
          aula({
            assistantValue: 10.5,
            professor: { name: "Carlos" },
          }),
        ],
      }),
    );
    expect(texto).toContain("*Como auxiliar* — R$ 10,50");
    expect(texto).toContain("• 17/10 18:00 · Turma · R$ 10,50 · prof.: Carlos");
  });

  it("omite a seção de auxiliar quando não houve aula como auxiliar", () => {
    expect(formatarFechamentoProfessor("Ana", resumo())).not.toContain(
      "Como auxiliar",
    );
  });

  it("só como auxiliar: não mostra a seção 'Como professor'", () => {
    const texto = formatarFechamentoProfessor(
      "Ana",
      resumo({
        totalTurmas: 0,
        aulas: [],
        valorAulas: 0,
        valorComoAuxiliar: 10.5,
        totalReceber: 10.5,
        aulasComoAuxiliar: [
          aula({ assistantValue: 10.5, professor: { name: "Carlos" } }),
        ],
      }),
    );
    expect(texto).not.toContain("Como professor");
    expect(texto).toContain("*Como auxiliar*");
  });

  it("sem nenhuma aula: avisa em vez de deixar o texto vazio", () => {
    const texto = formatarFechamentoProfessor(
      "Ana",
      resumo({
        totalTurmas: 0,
        aulas: [],
        valorAulas: 0,
        totalReceber: 0,
      }),
    );
    expect(texto).toContain("Nenhuma aula neste período.");
    expect(texto).toContain("*Total a receber: R$ 0,00*");
  });

  it("tira *, _ e ~ do nome para não quebrar a formatação", () => {
    const texto = formatarFechamentoProfessor("Ana *Maria*", resumo());
    expect(texto).toContain("*Fechamento — Ana Maria*");
  });

  describe("status", () => {
    it("período em aberto", () => {
      expect(formatarFechamentoProfessor("A", resumo())).toContain(
        "Status: período em aberto",
      );
    });

    it("fechado e aguardando pagamento", () => {
      const texto = formatarFechamentoProfessor(
        "A",
        resumo({ fechamento: { pago: false, pagoEm: null, valorPago: null } }),
      );
      expect(texto).toContain("Status: 🔒 período fechado, aguardando pagamento");
    });

    it("pago: traz a data e o valor registrados", () => {
      const texto = formatarFechamentoProfessor(
        "A",
        resumo({
          fechamento: {
            pago: true,
            pagoEm: new Date("2026-11-01T15:00:00.000Z"),
            valorPago: 28,
          },
        }),
      );
      expect(texto).toContain("Status: ✅ pago em 01/11/2026 · R$ 28,00");
    });
  });
});

describe("formatarFechamentoGeral", () => {
  const geral = (
    parcial: Partial<ResumoGeralExport> = {},
  ): ResumoGeralExport => ({
    periodo: PERIODO,
    fechamento: null,
    totalGeralProfessor: 56,
    totalGeralAuxiliares: 10.5,
    totalGeral: 66.5,
    professores: [
      {
        professorId: "a",
        nome: "Ana Souza",
        totalAulas: 1,
        valorAulas: 28,
        valorComoAuxiliar: 10.5,
        totalReceber: 38.5,
        pago: true,
        pagoEm: new Date("2026-11-01T15:00:00.000Z"),
        valorPago: 38.5,
      },
      {
        professorId: "b",
        nome: "Bruno Lima",
        totalAulas: 1,
        valorAulas: 28,
        valorComoAuxiliar: 0,
        totalReceber: 28,
        pago: false,
        pagoEm: null,
        valorPago: null,
      },
    ],
    ...parcial,
  });

  const detalhes = [
    {
      professorId: "a",
      resumo: resumo({
        valorComoAuxiliar: 10.5,
        totalReceber: 38.5,
        aulasComoAuxiliar: [
          aula({ assistantValue: 10.5, professor: { name: "Bruno Lima" } }),
        ],
      }),
    },
    {
      professorId: "b",
      resumo: resumo({
        aulas: [aula({ date: new Date("2026-10-19T00:00:00.000Z") })],
      }),
    },
  ];

  it("cabeçalho com período, status e totais", () => {
    const texto = formatarFechamentoGeral(geral(), detalhes);

    expect(texto).toContain("*Fechamento geral*");
    expect(texto).toContain("Período: 16 a 31 de outubro de 2026");
    expect(texto).toContain(
      "Total geral: *R$ 66,50* (professores R$ 56,00 · auxiliares R$ 10,50)",
    );
  });

  it("período aberto: não mostra marcas de pago / a pagar", () => {
    const texto = formatarFechamentoGeral(geral({ fechamento: null }), detalhes);

    expect(texto).toContain("Status: período em aberto");
    expect(texto).not.toContain("a pagar");
    expect(texto).not.toContain("✅");
  });

  it("período fechado: marca quem foi pago (com data) e quem está a pagar", () => {
    const texto = formatarFechamentoGeral(
      geral({ fechamento: { id: "cp" } }),
      detalhes,
    );

    expect(texto).toContain("Status: 🔒 período fechado");
    expect(texto).toContain("*Ana Souza* — *R$ 38,50* ✅ pago em 01/11/2026");
    expect(texto).toContain("*Bruno Lima* — *R$ 28,00* ⏳ a pagar");
  });

  it("inclui a lista de aulas de cada professor", () => {
    const texto = formatarFechamentoGeral(geral(), detalhes);

    expect(texto).toContain("• 17/10 18:00 · Turma · R$ 28,00");
    expect(texto).toContain("• 19/10 18:00 · Turma · R$ 28,00");
    expect(texto).toContain("*Como auxiliar* — R$ 10,50");
  });

  it("os professores aparecem na ordem recebida", () => {
    const texto = formatarFechamentoGeral(geral(), detalhes);

    expect(texto.indexOf("*Ana Souza*")).toBeLessThan(
      texto.indexOf("*Bruno Lima*"),
    );
  });

  it("professor sem detalhe disponível ainda aparece com o total (sem quebrar)", () => {
    const texto = formatarFechamentoGeral(geral(), []);

    expect(texto).toContain("*Ana Souza* — *R$ 38,50*");
    expect(texto).toContain("*Bruno Lima* — *R$ 28,00*");
  });

  it("sem movimentação: avisa", () => {
    const texto = formatarFechamentoGeral(
      geral({
        professores: [],
        totalGeral: 0,
        totalGeralProfessor: 0,
        totalGeralAuxiliares: 0,
      }),
      [],
    );

    expect(texto).toContain("Nenhuma movimentação neste período.");
  });

  it("tira *, _ e ~ dos nomes dos professores", () => {
    const base = geral();
    const texto = formatarFechamentoGeral(
      geral({
        professores: [{ ...base.professores[0], nome: "Ana *Souza*" }],
      }),
      [],
    );

    expect(texto).toContain("*Ana Souza* — ");
  });
});
