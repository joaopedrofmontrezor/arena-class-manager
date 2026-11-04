import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ClosingPeriodsService } from "./closing-periods.service";
import { ClosingService } from "./closing.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ClosingPeriodsService", () => {
  let service: ClosingPeriodsService;
  let prisma: any;
  let closing: { getResumoProfessor: jest.Mock<(...args: any[]) => any> };

  const OWNER_ID = "owner-1";
  const PROF_ID = "prof-1";

  
  const INICIO_ENCERRADO = "2026-08-01";
  const INICIO_FUTURO = "2099-01-01";

  const registroFechado = {
    id: "cp-1",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-15T00:00:00.000Z"),
    label: "01 a 15 de agosto",
    closedAt: new Date("2026-08-20T12:00:00.000Z"),
    closedById: OWNER_ID,
  };

  beforeEach(async () => {
    prisma = {
      closedPeriod: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      closingPayment: { create: jest.fn(), deleteMany: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    closing = { getResumoProfessor: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClosingPeriodsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClosingService, useValue: closing },
      ],
    }).compile();

    service = moduleRef.get(ClosingPeriodsService);
  });

  describe("close", () => {
    it("recusa um início que não seja dia 1 ou 16 (400), sem tocar no banco", async () => {
      await expect(service.close(OWNER_ID, "2026-08-05")).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.closedPeriod.findUnique).not.toHaveBeenCalled();
      expect(prisma.closedPeriod.create).not.toHaveBeenCalled();
    });

    it("recusa fechar um período que ainda não terminou (400)", async () => {
      await expect(service.close(OWNER_ID, INICIO_FUTURO)).rejects.toThrow(
        /depois que ele terminar/,
      );
      expect(prisma.closedPeriod.create).not.toHaveBeenCalled();
    });

    it("recusa fechar duas vezes o mesmo período (409)", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue({ id: "cp-1" });

      await expect(service.close(OWNER_ID, INICIO_ENCERRADO)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.closedPeriod.create).not.toHaveBeenCalled();
    });

    it("trata a corrida de dois fechamentos simultâneos (violação única P2002) como 409", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);
      prisma.closedPeriod.create.mockRejectedValue({ code: "P2002" });

      await expect(service.close(OWNER_ID, INICIO_ENCERRADO)).rejects.toThrow(
        ConflictException,
      );
    });

    it("não esconde erros inesperados do banco", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);
      prisma.closedPeriod.create.mockRejectedValue(new Error("banco caiu"));

      await expect(service.close(OWNER_ID, INICIO_ENCERRADO)).rejects.toThrow(
        "banco caiu",
      );
    });

    it("fecha a quinzena 01-15 gravando início, fim, rótulo e quem fechou", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);
      prisma.closedPeriod.create.mockResolvedValue(registroFechado);

      const resultado = await service.close(OWNER_ID, INICIO_ENCERRADO);

      expect(resultado).toBe(registroFechado);
      const { data } = prisma.closedPeriod.create.mock.calls[0][0];
      expect(data.periodStart).toEqual(new Date("2026-08-01T00:00:00.000Z"));
      expect(data.periodEnd.toISOString().slice(0, 10)).toBe("2026-08-15");
      expect(data.label).toBe("01 a 15 de agosto");
      expect(data.closedById).toBe(OWNER_ID);
    });

    it("aceita o dia 16 e fecha até o último dia do mês", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);
      prisma.closedPeriod.create.mockResolvedValue(registroFechado);

      await service.close(OWNER_ID, "2026-08-16");

      const { data } = prisma.closedPeriod.create.mock.calls[0][0];
      expect(data.periodEnd.toISOString().slice(0, 10)).toBe("2026-08-31");
      expect(data.label).toBe("16 a 31 de agosto");
    });
  });

  describe("reopen", () => {
    it("404 se o período fechado não existe", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);

      await expect(service.reopen("nao-existe")).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.closedPeriod.delete).not.toHaveBeenCalled();
    });

    it("409 se ainda há pagamentos registrados: precisa desfazê-los antes", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue({
        ...registroFechado,
        _count: { payments: 2 },
      });

      await expect(service.reopen("cp-1")).rejects.toThrow(ConflictException);
      expect(prisma.closedPeriod.delete).not.toHaveBeenCalled();
    });

    it("reabre (apaga o fechamento) quando não há pagamentos", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue({
        ...registroFechado,
        _count: { payments: 0 },
      });
      prisma.closedPeriod.delete.mockResolvedValue(registroFechado);

      await expect(service.reopen("cp-1")).resolves.toEqual({ ok: true });
      expect(prisma.closedPeriod.delete).toHaveBeenCalledWith({
        where: { id: "cp-1" },
      });
    });

    it("se um pagamento aparecer no meio do caminho (P2003), responde 409 em vez de 500", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue({
        ...registroFechado,
        _count: { payments: 0 },
      });
      prisma.closedPeriod.delete.mockRejectedValue({ code: "P2003" });

      await expect(service.reopen("cp-1")).rejects.toThrow(ConflictException);
    });
  });

  describe("markPaid", () => {
    function cenarioValido(totalReceber = 98.5) {
      prisma.closedPeriod.findUnique.mockResolvedValue(registroFechado);
      prisma.user.findUnique.mockResolvedValue({ id: PROF_ID });
      closing.getResumoProfessor.mockResolvedValue({ totalReceber });
      prisma.closingPayment.create.mockResolvedValue({ id: "pg-1" });
    }

    it("404 se o período fechado não existe", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);

      await expect(
        service.markPaid(OWNER_ID, "nao-existe", PROF_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.closingPayment.create).not.toHaveBeenCalled();
    });

    it("404 se o professor não existe", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(registroFechado);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.markPaid(OWNER_ID, "cp-1", "fantasma"),
      ).rejects.toThrow(NotFoundException);
    });

    it("400 se o professor não tem nada a receber no período", async () => {
      cenarioValido(0);

      await expect(
        service.markPaid(OWNER_ID, "cp-1", PROF_ID),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.closingPayment.create).not.toHaveBeenCalled();
    });

    it("calcula o total sobre o período inteiro e grava uma fotografia do valor", async () => {
      cenarioValido(98.5);

      await service.markPaid(OWNER_ID, "cp-1", PROF_ID);

      const [profId, periodo] = closing.getResumoProfessor.mock.calls[0];
      expect(profId).toBe(PROF_ID);
      expect(periodo.start).toEqual(registroFechado.periodStart);
      
      expect(periodo.end).toEqual(new Date("2026-08-15T23:59:59.999Z"));

      expect(prisma.closingPayment.create).toHaveBeenCalledWith({
        data: {
          closedPeriodId: "cp-1",
          professorId: PROF_ID,
          amount: 98.5,
          paidById: OWNER_ID,
        },
      });
    });

    it("409 se o professor já foi marcado como pago (P2002)", async () => {
      cenarioValido();
      prisma.closingPayment.create.mockRejectedValue({ code: "P2002" });

      await expect(
        service.markPaid(OWNER_ID, "cp-1", PROF_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("unmarkPaid", () => {
    it("404 se não havia pagamento para desfazer", async () => {
      prisma.closingPayment.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.unmarkPaid("cp-1", PROF_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("desfaz o pagamento do professor naquele período", async () => {
      prisma.closingPayment.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.unmarkPaid("cp-1", PROF_ID)).resolves.toEqual({
        ok: true,
      });
      expect(prisma.closingPayment.deleteMany).toHaveBeenCalledWith({
        where: { closedPeriodId: "cp-1", professorId: PROF_ID },
      });
    });
  });

  describe("assertDateOpen", () => {
    it("deixa passar quando nenhuma quinzena fechada contém a data", async () => {
      prisma.closedPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.assertDateOpen(new Date("2026-09-10")),
      ).resolves.toBeUndefined();
    });

    it("procura um fechamento cujo intervalo contenha a data", async () => {
      prisma.closedPeriod.findFirst.mockResolvedValue(null);
      const data = new Date("2026-09-10");

      await service.assertDateOpen(data);

      expect(prisma.closedPeriod.findFirst).toHaveBeenCalledWith({
        where: { periodStart: { lte: data }, periodEnd: { gte: data } },
        select: { label: true },
      });
    });

    it("409 citando a quinzena quando a data cai num período fechado", async () => {
      prisma.closedPeriod.findFirst.mockResolvedValue({
        label: "01 a 15 de agosto",
      });

      const promessa = service.assertDateOpen(new Date("2026-08-05"));
      await expect(promessa).rejects.toThrow(ConflictException);
      await expect(promessa).rejects.toThrow(/01 a 15 de agosto/);
    });
  });

  describe("withStatusGeral", () => {
    const resumo = {
      periodo: { start: new Date("2026-08-01T00:00:00.000Z") },
      professores: [{ professorId: "prof-1" }, { professorId: "prof-2" }],
      totalGeral: 100,
    };

    it("sem fechamento: fechamento null e ninguém marcado como pago", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);

      const r = await service.withStatusGeral(resumo);

      expect(r.fechamento).toBeNull();
      expect(r.professores.every((p) => p.pago === false)).toBe(true);
      expect(r.totalGeral).toBe(100);
    });

    it("com fechamento: marca como pago só quem tem pagamento, com valor e data", async () => {
      const paidAt = new Date("2026-08-21T10:00:00.000Z");
      prisma.closedPeriod.findUnique.mockResolvedValue({
        ...registroFechado,
        payments: [{ professorId: "prof-2", amount: "98.50", paidAt }],
      });

      const r = await service.withStatusGeral(resumo);

      expect(r.fechamento).toEqual({
        id: "cp-1",
        fechadoEm: registroFechado.closedAt,
      });
      const [p1, p2] = r.professores;
      expect(p1).toMatchObject({ pago: false, pagoEm: null, valorPago: null });
      expect(p2).toMatchObject({ pago: true, pagoEm: paidAt, valorPago: 98.5 });
    });

    it("busca o fechamento pelo início do período", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);

      await service.withStatusGeral(resumo);

      expect(prisma.closedPeriod.findUnique).toHaveBeenCalledWith({
        where: { periodStart: resumo.periodo.start },
        include: { payments: true },
      });
    });
  });

  describe("withStatusProfessor", () => {
    const resumo = {
      periodo: { start: new Date("2026-08-01T00:00:00.000Z") },
      totalReceber: 98.5,
    };

    it("período aberto: fechamento null", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue(null);

      const r = await service.withStatusProfessor(resumo, PROF_ID);

      expect(r.fechamento).toBeNull();
      expect(r.totalReceber).toBe(98.5);
    });

    it("período fechado e ainda não pago", async () => {
      prisma.closedPeriod.findUnique.mockResolvedValue({
        ...registroFechado,
        payments: [],
      });

      const r = await service.withStatusProfessor(resumo, PROF_ID);

      expect(r.fechamento).toMatchObject({
        id: "cp-1",
        pago: false,
        pagoEm: null,
        valorPago: null,
      });
    });

    it("período fechado e pago: traz data e valor, e só consulta o pagamento DESTE professor", async () => {
      const paidAt = new Date("2026-08-21T10:00:00.000Z");
      prisma.closedPeriod.findUnique.mockResolvedValue({
        ...registroFechado,
        payments: [{ professorId: PROF_ID, amount: "98.50", paidAt }],
      });

      const r = await service.withStatusProfessor(resumo, PROF_ID);

      expect(r.fechamento).toMatchObject({
        pago: true,
        pagoEm: paidAt,
        valorPago: 98.5,
      });
      expect(prisma.closedPeriod.findUnique).toHaveBeenCalledWith({
        where: { periodStart: resumo.periodo.start },
        include: { payments: { where: { professorId: PROF_ID } } },
      });
    });
  });
});
