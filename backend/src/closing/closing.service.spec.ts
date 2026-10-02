import { Test } from "@nestjs/testing";
import { ClosingService } from "./closing.service";
import { PrismaService } from "../prisma/prisma.service";
import { Periodo } from "./period.util";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("ClosingService", () => {
  let service: ClosingService;
  let prisma: any;

  const PERIODO: Periodo = {
    start: new Date(Date.UTC(2026, 8, 1)),
    end: new Date(Date.UTC(2026, 8, 15, 23, 59, 59, 999)),
    label: "01 a 15 de setembro",
  };

  beforeEach(async () => {
    prisma = {
      lesson: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ClosingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ClosingService);
  });

  describe("getResumoProfessor", () => {
    it("soma corretamente aulas como professor (TURMA + PERSONAL) e aulas como auxiliar", async () => {
      prisma.lesson.findMany
        .mockResolvedValueOnce([
          { type: "TURMA", professorValue: 28, assistantValue: 10.5 },
          { type: "PERSONAL", professorValue: 60, assistantValue: 10.5 },
        ])
        .mockResolvedValueOnce([
          { type: "TURMA", professorValue: 28, assistantValue: 10.5 },
        ]);

      const resumo = await service.getResumoProfessor("prof-1", PERIODO);

      expect(resumo.totalTurmas).toBe(1);
      expect(resumo.totalPersonais).toBe(1);
      expect(resumo.valorAulas).toBe(88);
      expect(resumo.valorComoAuxiliar).toBe(10.5);
      expect(resumo.totalReceber).toBe(98.5);
    });

    it("retorna zero em todos os totais quando não há aulas no período", async () => {
      prisma.lesson.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const resumo = await service.getResumoProfessor("prof-1", PERIODO);

      expect(resumo.totalTurmas).toBe(0);
      expect(resumo.totalPersonais).toBe(0);
      expect(resumo.valorAulas).toBe(0);
      expect(resumo.valorComoAuxiliar).toBe(0);
      expect(resumo.totalReceber).toBe(0);
    });

    it("filtra as consultas do banco pelo intervalo de datas do período informado", async () => {
      prisma.lesson.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getResumoProfessor("prof-1", PERIODO);

      expect(prisma.lesson.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          professorId: "prof-1",
          date: { gte: PERIODO.start, lte: PERIODO.end },
        },
        orderBy: { date: "asc" },
        include: { assistant: { select: { id: true, name: true } } },
      });
      expect(prisma.lesson.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          assistantId: "prof-1",
          date: { gte: PERIODO.start, lte: PERIODO.end },
        },
        orderBy: { date: "asc" },
        include: { professor: { select: { name: true } } },
      });
    });

    it("usa o período atual (auto-calculado) quando nenhum período é informado", async () => {
      prisma.lesson.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const resumo = await service.getResumoProfessor("prof-1");

      expect(resumo.periodo.start).toBeInstanceOf(Date);
      expect(resumo.periodo.end).toBeInstanceOf(Date);
      expect(typeof resumo.periodo.label).toBe("string");
    });
  });

  describe("getResumoGeral", () => {
    it("inclui um professor inativo no fechamento geral se ele deu aula no período", async () => {
      prisma.user.findMany

        .mockResolvedValueOnce([])

        .mockResolvedValueOnce([
          { id: "prof-inativo", name: "Ex-Professor", active: false },
        ]);

      prisma.lesson.findMany

        .mockResolvedValueOnce([
          { professorId: "prof-inativo", assistantId: "prof-inativo" },
        ])

        .mockResolvedValueOnce([
          { type: "TURMA", professorValue: 28, assistantValue: 10.5 },
        ])

        .mockResolvedValueOnce([]);

      const resumo = await service.getResumoGeral(PERIODO);

      expect(resumo.professores).toHaveLength(1);
      expect(resumo.professores[0]).toMatchObject({
        professorId: "prof-inativo",
        nome: "Ex-Professor",
        ativo: false,
        totalAulas: 1,
      });
    });

    it("exclui professores ativos sem nenhuma movimentação no período", async () => {
      prisma.user.findMany
        .mockResolvedValueOnce([
          { id: "prof-sem-aula", name: "Sem Aula", active: true },
        ])
        .mockResolvedValueOnce([
          { id: "prof-sem-aula", name: "Sem Aula", active: true },
        ]);

      prisma.lesson.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const resumo = await service.getResumoGeral(PERIODO);

      expect(resumo.professores).toHaveLength(0);
      expect(resumo.totalGeral).toBe(0);
    });

    it("calcula totalGeralProfessor, totalGeralAuxiliares e totalGeral somando todos os professores com movimentação", async () => {
      prisma.user.findMany
        .mockResolvedValueOnce([
          { id: "prof-a", name: "A", active: true },
          { id: "prof-b", name: "B", active: true },
        ])
        .mockResolvedValueOnce([
          { id: "prof-a", name: "A", active: true },
          { id: "prof-b", name: "B", active: true },
        ]);

      prisma.lesson.findMany
        .mockResolvedValueOnce([
          { professorId: "prof-a", assistantId: "prof-b" },
        ])

        .mockResolvedValueOnce([
          { type: "TURMA", professorValue: 28, assistantValue: 10.5 },
        ])

        .mockResolvedValueOnce([])

        .mockResolvedValueOnce([])

        .mockResolvedValueOnce([
          { type: "TURMA", professorValue: 28, assistantValue: 10.5 },
        ]);

      const resumo = await service.getResumoGeral(PERIODO);

      expect(resumo.totalGeralProfessor).toBe(28);
      expect(resumo.totalGeralAuxiliares).toBe(10.5);
      expect(resumo.totalGeral).toBe(38.5);
    });
  });
});
