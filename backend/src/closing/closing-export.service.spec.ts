import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ClosingExportService } from "./closing-export.service";
import { ClosingService } from "./closing.service";
import { ClosingPeriodsService } from "./closing-periods.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ClosingExportService", () => {
  let service: ClosingExportService;
  let prisma: any;
  let closing: {
    getResumoProfessor: jest.Mock<(...args: any[]) => any>;
    getResumoGeral: jest.Mock<(...args: any[]) => any>;
  };
  let periods: {
    withStatusProfessor: jest.Mock<(...args: any[]) => any>;
    withStatusGeral: jest.Mock<(...args: any[]) => any>;
  };

  const PERIODO = {
    start: new Date("2026-10-16T00:00:00.000Z"),
    end: new Date("2026-10-31T23:59:59.999Z"),
    label: "16 a 31 de outubro",
  };

  const resumoProfessor = (extra: Record<string, unknown> = {}) => ({
    periodo: PERIODO,
    totalTurmas: 1,
    totalPersonais: 0,
    valorAulas: 28,
    valorComoAuxiliar: 0,
    totalReceber: 28,
    aulas: [
      {
        date: new Date("2026-10-17T00:00:00.000Z"),
        time: "18:00",
        type: "TURMA",
        professorValue: "28",
        assistantValue: "0",
        assistant: null,
      },
    ],
    aulasComoAuxiliar: [],
    ...extra,
  });

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    closing = {
      getResumoProfessor: jest.fn(),
      getResumoGeral: jest.fn(),
    };
    periods = {
      withStatusProfessor: jest.fn(async (r: any) => ({
        ...r,
        fechamento: null,
      })),
      withStatusGeral: jest.fn(async (r: any) => ({ ...r, fechamento: null })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClosingExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClosingService, useValue: closing },
        { provide: ClosingPeriodsService, useValue: periods },
      ],
    }).compile();

    service = moduleRef.get(ClosingExportService);
  });

  describe("textoProfessor", () => {
    it("monta o texto com o nome recebido e o resumo do período pedido", async () => {
      closing.getResumoProfessor.mockResolvedValue(resumoProfessor());

      const texto = await service.textoProfessor(
        "prof-1",
        "Ana Souza",
        PERIODO,
      );

      expect(closing.getResumoProfessor).toHaveBeenCalledWith(
        "prof-1",
        PERIODO,
      );
      expect(texto).toContain("*Fechamento — Ana Souza*");
      expect(texto).toContain("*Total a receber: R$ 28,00*");
    });

    it("inclui o status de pagamento do PRÓPRIO professor", async () => {
      closing.getResumoProfessor.mockResolvedValue(resumoProfessor());
      periods.withStatusProfessor.mockImplementation(async (r: any) => ({
        ...r,
        fechamento: {
          pago: true,
          pagoEm: new Date("2026-11-01T15:00:00.000Z"),
          valorPago: 28,
        },
      }));

      const texto = await service.textoProfessor("prof-1", "Ana");

      expect(periods.withStatusProfessor).toHaveBeenCalledWith(
        expect.anything(),
        "prof-1",
      );
      expect(texto).toContain("Status: ✅ pago em 01/11/2026");
    });
  });

  describe("textoProfessorPorId", () => {
    it("404 se o professor não existe", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.textoProfessorPorId("fantasma")).rejects.toThrow(
        NotFoundException,
      );
      expect(closing.getResumoProfessor).not.toHaveBeenCalled();
    });

    it("usa o nome do banco", async () => {
      prisma.user.findUnique.mockResolvedValue({ name: "Bruno Lima" });
      closing.getResumoProfessor.mockResolvedValue(resumoProfessor());

      const texto = await service.textoProfessorPorId("prof-2", PERIODO);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "prof-2" },
        select: { name: true },
      });
      expect(texto).toContain("*Fechamento — Bruno Lima*");
    });
  });

  describe("textoGeral", () => {
    const geral = {
      periodo: PERIODO,
      professores: [
        {
          professorId: "a",
          nome: "Ana Souza",
          totalAulas: 1,
          valorAulas: 28,
          valorComoAuxiliar: 0,
          totalReceber: 28,
        },
        {
          professorId: "b",
          nome: "Bruno Lima",
          totalAulas: 1,
          valorAulas: 28,
          valorComoAuxiliar: 0,
          totalReceber: 28,
        },
      ],
      totalGeralProfessor: 56,
      totalGeralAuxiliares: 0,
      totalGeral: 56,
    };

    it("busca o detalhe de cada professor do período do fechamento geral", async () => {
      closing.getResumoGeral.mockResolvedValue(geral);
      periods.withStatusGeral.mockImplementation(async (r: any) => ({
        ...r,
        fechamento: null,
        professores: r.professores.map((p: any) => ({
          ...p,
          pago: false,
          pagoEm: null,
          valorPago: null,
        })),
      }));
      closing.getResumoProfessor.mockResolvedValue(resumoProfessor());

      const texto = await service.textoGeral(PERIODO);

      expect(closing.getResumoGeral).toHaveBeenCalledWith(PERIODO);
      expect(closing.getResumoProfessor).toHaveBeenCalledTimes(2);
      expect(closing.getResumoProfessor).toHaveBeenCalledWith("a", PERIODO);
      expect(closing.getResumoProfessor).toHaveBeenCalledWith("b", PERIODO);
      expect(texto).toContain("*Fechamento geral*");
      expect(texto).toContain("*Ana Souza*");
      expect(texto).toContain("*Bruno Lima*");
      expect(texto).toContain("• 17/10 18:00 · Turma · R$ 28,00");
    });

    it("sem professores com movimento, não busca detalhes", async () => {
      closing.getResumoGeral.mockResolvedValue({
        ...geral,
        professores: [],
        totalGeral: 0,
        totalGeralProfessor: 0,
      });

      const texto = await service.textoGeral(PERIODO);

      expect(closing.getResumoProfessor).not.toHaveBeenCalled();
      expect(texto).toContain("Nenhuma movimentação neste período.");
    });
  });
});
