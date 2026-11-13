import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { LessonsService } from "./lessons.service";
import { PrismaService } from "../prisma/prisma.service";
import { ClosingPeriodsService } from "../closing/closing-periods.service";
import { AuditService } from "../audit/audit.service";
import { LessonType, Role } from "@prisma/client";

describe("LessonsService", () => {
  let service: LessonsService;

  let prisma: any;
  let closingPeriods: { assertDateOpen: jest.Mock<(...args: any[]) => any> };
  let audit: Record<
    "aulaCriada" | "aulaEditada" | "aulaExcluida",
    jest.Mock<(...args: any[]) => any>
  >;

  const PROFESSOR_ID = "professor-1";
  const AUXILIAR_ID = "professor-2";

  beforeEach(async () => {
    prisma = {
      lesson: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
    };

    
    audit = {
      aulaCriada: jest.fn(async () => undefined),
      aulaEditada: jest.fn(async () => undefined),
      aulaExcluida: jest.fn(async () => undefined),
    };
    closingPeriods = { assertDateOpen: jest.fn() };
    closingPeriods.assertDateOpen.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClosingPeriodsService, useValue: closingPeriods },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(LessonsService);
  });

  function auxiliarValido() {
    prisma.user.findUnique.mockResolvedValue({
      id: AUXILIAR_ID,
      active: true,
      role: Role.PROFESSOR,
    });
  }

  describe("create", () => {
    it("TURMA sempre grava R$ 28,00, mesmo que o valor enviado seja outro", async () => {
      auxiliarValido();
      await service.create(PROFESSOR_ID, {
        date: "2026-09-10",
        time: "08:00",
        type: LessonType.TURMA,
        assistantId: AUXILIAR_ID,
        professorValue: 999,
      } as any);

      expect(prisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            professorValue: 28,
            assistantValue: 10.5,
          }),
        }),
      );
    });

    it("aula sem auxiliar (assistantId ausente) grava assistantId null e assistantValue 0", async () => {
      await service.create(PROFESSOR_ID, {
        date: "2026-09-10",
        time: "08:00",
        type: LessonType.TURMA,
      } as any);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            professorValue: 28,
            assistantId: null,
            assistantValue: 0,
          }),
        }),
      );
    });

    it("assistantId vazio ou null também significa sem auxiliar", async () => {
      for (const vazio of ["", null]) {
        prisma.lesson.create.mockClear();
        await service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.TURMA,
          assistantId: vazio,
        } as any);

        expect(prisma.lesson.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              assistantId: null,
              assistantValue: 0,
            }),
          }),
        );
      }
    });

    it("PERSONAL grava o valor informado", async () => {
      auxiliarValido();
      await service.create(PROFESSOR_ID, {
        date: "2026-09-10",
        time: "08:00",
        type: LessonType.PERSONAL,
        assistantId: AUXILIAR_ID,
        professorValue: 70,
      } as any);

      expect(prisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ professorValue: 70 }),
        }),
      );
    });

    it("PERSONAL sem valor lança erro", async () => {
      auxiliarValido();
      await expect(
        service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.PERSONAL,
          assistantId: AUXILIAR_ID,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("professor nao pode ser o proprio auxiliar", async () => {
      await expect(
        service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.TURMA,
          assistantId: PROFESSOR_ID,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("auxiliar inativo lança erro", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: AUXILIAR_ID,
        active: false,
        role: Role.PROFESSOR,
      });
      await expect(
        service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.TURMA,
          assistantId: AUXILIAR_ID,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("auxiliar inexistente lança erro", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.TURMA,
          assistantId: "nao-existe",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createBatch", () => {
    const base = { date: "2026-09-10" };

    it("cria todas as aulas do dia na mesma transação, com valores corretos", async () => {
      auxiliarValido();

      await service.createBatch(PROFESSOR_ID, {
        ...base,
        lessons: [
          { time: "08:00", type: LessonType.TURMA, assistantId: AUXILIAR_ID },
          { time: "09:00", type: LessonType.TURMA, assistantId: null },
          { time: "10:00", type: LessonType.PERSONAL, professorValue: 70 },
        ],
      } as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.lesson.create).toHaveBeenCalledTimes(3);

      const dados = prisma.lesson.create.mock.calls.map(
        (c: any[]) => c[0].data,
      );
      expect(dados[0]).toMatchObject({
        time: "08:00",
        professorValue: 28,
        assistantId: AUXILIAR_ID,
        assistantValue: 10.5,
      });
      expect(dados[1]).toMatchObject({
        time: "09:00",
        professorValue: 28,
        assistantId: null,
        assistantValue: 0,
      });
      expect(dados[2]).toMatchObject({
        time: "10:00",
        professorValue: 70,
        assistantId: null,
        assistantValue: 0,
      });
    });

    it("auxiliar inválido em qualquer item cancela o lote inteiro (nada é salvo)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createBatch(PROFESSOR_ID, {
          ...base,
          lessons: [
            { time: "08:00", type: LessonType.TURMA, assistantId: null },
            { time: "09:00", type: LessonType.TURMA, assistantId: "x" },
          ],
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.lesson.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("PERSONAL sem valor em qualquer item cancela o lote inteiro", async () => {
      await expect(
        service.createBatch(PROFESSOR_ID, {
          ...base,
          lessons: [
            { time: "08:00", type: LessonType.TURMA },
            { time: "09:00", type: LessonType.PERSONAL },
          ],
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.lesson.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("o professor não pode ser auxiliar de si mesmo em nenhum item", async () => {
      await expect(
        service.createBatch(PROFESSOR_ID, {
          ...base,
          lessons: [
            {
              time: "08:00",
              type: LessonType.TURMA,
              assistantId: PROFESSOR_ID,
            },
          ],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("update", () => {
    function aulaExistenteTurma() {
      prisma.lesson.findUnique.mockResolvedValue({
        id: "lesson-1",
        professorId: PROFESSOR_ID,
        assistantId: AUXILIAR_ID,
        type: LessonType.TURMA,
        professorValue: 28,
      });
    }

    function aulaExistentePersonal() {
      prisma.lesson.findUnique.mockResolvedValue({
        id: "lesson-1",
        professorId: PROFESSOR_ID,
        assistantId: AUXILIAR_ID,
        type: LessonType.PERSONAL,
        professorValue: 100,
      });
    }

    it("mudar de TURMA para PERSONAL sem valor deve falhar (nao pode herdar R$28 como se fosse valido)", async () => {
      aulaExistenteTurma();
      auxiliarValido();
      await expect(
        service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
          type: LessonType.PERSONAL,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("mudar de PERSONAL para TURMA deve forcar o valor para R$28, descartando o valor antigo", async () => {
      aulaExistentePersonal();
      auxiliarValido();
      await service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
        type: LessonType.TURMA,
      } as any);

      expect(prisma.lesson.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ professorValue: 28 }),
        }),
      );
    });

    it("editar so o valor de uma aula PERSONAL existente funciona", async () => {
      aulaExistentePersonal();
      auxiliarValido();
      await service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
        professorValue: 60,
      } as any);

      expect(prisma.lesson.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ professorValue: 60 }),
        }),
      );
    });

    it("assistantId null remove o auxiliar e zera assistantValue", async () => {
      aulaExistenteTurma();
      await service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
        assistantId: null,
      } as any);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.lesson.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assistantId: null,
            assistantValue: 0,
          }),
        }),
      );
    });

    it("sem assistantId no DTO mantém o auxiliar atual", async () => {
      aulaExistenteTurma();
      auxiliarValido();
      await service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
        time: "09:00",
      } as any);

      expect(prisma.lesson.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assistantId: AUXILIAR_ID,
            assistantValue: 10.5,
          }),
        }),
      );
    });

    it("professor B nao pode editar aula do professor A", async () => {
      aulaExistenteTurma();
      await expect(
        service.update("lesson-1", "outro-professor", "PROFESSOR", {
          time: "09:00",
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("OWNER pode editar aula de qualquer professor", async () => {
      aulaExistenteTurma();
      auxiliarValido();
      await service.update("lesson-1", "owner-id", "OWNER", {
        time: "09:00",
      } as any);
      expect(prisma.lesson.update).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("professor B nao pode excluir aula do professor A", async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: "lesson-1",
        professorId: PROFESSOR_ID,
      });
      await expect(
        service.remove("lesson-1", "outro-professor", "PROFESSOR"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("período fechado (trava de edição)", () => {
    const FECHADO = () =>
      new ConflictException("O período de 01 a 15 de setembro está fechado.");

    function aulaExistente() {
      prisma.lesson.findUnique.mockResolvedValue({
        id: "lesson-1",
        date: new Date("2026-09-10"),
        professorId: PROFESSOR_ID,
        assistantId: null,
        type: LessonType.TURMA,
        professorValue: 28,
      });
    }

    it("create: consulta a data da aula e NÃO grava se o período está fechado", async () => {
      closingPeriods.assertDateOpen.mockRejectedValue(FECHADO());

      await expect(
        service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.TURMA,
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(closingPeriods.assertDateOpen).toHaveBeenCalledWith(
        new Date("2026-09-10"),
      );
      expect(prisma.lesson.create).not.toHaveBeenCalled();
    });

    it("createBatch: NÃO grava nenhuma aula se o período está fechado", async () => {
      closingPeriods.assertDateOpen.mockRejectedValue(FECHADO());

      await expect(
        service.createBatch(PROFESSOR_ID, {
          date: "2026-09-10",
          lessons: [{ time: "08:00", type: LessonType.TURMA }],
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.lesson.create).not.toHaveBeenCalled();
    });

    it("update: bloqueia editar uma aula que já está num período fechado", async () => {
      aulaExistente();
      closingPeriods.assertDateOpen.mockRejectedValue(FECHADO());

      await expect(
        service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
          observation: "tentando mudar depois de fechado",
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(closingPeriods.assertDateOpen).toHaveBeenCalledWith(
        new Date("2026-09-10"),
      );
      expect(prisma.lesson.update).not.toHaveBeenCalled();
    });

    it("update: bloqueia MOVER uma aula de um período aberto para dentro de um fechado", async () => {
      aulaExistente();
      closingPeriods.assertDateOpen.mockImplementation(async (d: Date) => {
        if (d.toISOString().startsWith("2026-08-05")) throw FECHADO();
      });

      await expect(
        service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
          date: "2026-08-05",
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(closingPeriods.assertDateOpen).toHaveBeenCalledWith(
        new Date("2026-09-10"),
      );
      expect(closingPeriods.assertDateOpen).toHaveBeenCalledWith(
        new Date("2026-08-05"),
      );
      expect(prisma.lesson.update).not.toHaveBeenCalled();
    });

    it("update: o OWNER também é bloqueado (precisa reabrir o período)", async () => {
      aulaExistente();
      closingPeriods.assertDateOpen.mockRejectedValue(FECHADO());

      await expect(
        service.update("lesson-1", "owner-id", "OWNER", {
          observation: "x",
        } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.lesson.update).not.toHaveBeenCalled();
    });

    it("update: sem mudar a data, só consulta a data atual da aula", async () => {
      aulaExistente();

      await service.update("lesson-1", PROFESSOR_ID, "PROFESSOR", {
        observation: "ok",
      } as any);

      expect(closingPeriods.assertDateOpen).toHaveBeenCalledTimes(1);
      expect(prisma.lesson.update).toHaveBeenCalled();
    });

    it("update: quem não é dono recebe 403 antes de qualquer consulta ao período", async () => {
      aulaExistente();

      await expect(
        service.update("lesson-1", "outro-professor", "PROFESSOR", {
          observation: "x",
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(closingPeriods.assertDateOpen).not.toHaveBeenCalled();
    });

    it("remove: bloqueia excluir uma aula de período fechado", async () => {
      aulaExistente();
      closingPeriods.assertDateOpen.mockRejectedValue(FECHADO());

      await expect(
        service.remove("lesson-1", PROFESSOR_ID, "PROFESSOR"),
      ).rejects.toThrow(ConflictException);

      expect(prisma.lesson.delete).not.toHaveBeenCalled();
    });

    it("remove: exclui normalmente quando o período está aberto", async () => {
      aulaExistente();

      await service.remove("lesson-1", PROFESSOR_ID, "PROFESSOR");

      expect(prisma.lesson.delete).toHaveBeenCalledWith({
        where: { id: "lesson-1" },
      });
    });
  });

  describe("histórico de alterações", () => {
    const aulaAntes = {
      id: "lesson-1",
      professorId: PROFESSOR_ID,
      assistantId: null,
      type: LessonType.TURMA,
      professorValue: 28,
      date: new Date("2026-09-10T00:00:00.000Z"),
      time: "08:00",
    };

    it("criar: registra a aula criada, tendo o professor como autor", async () => {
      const criada = { ...aulaAntes, id: "nova" };
      prisma.lesson.create.mockResolvedValue(criada);

      await service.create(PROFESSOR_ID, {
        date: "2026-09-10",
        time: "08:00",
        type: LessonType.TURMA,
      } as any);

      expect(audit.aulaCriada).toHaveBeenCalledWith(PROFESSOR_ID, criada);
    });

    it("criar em lote: registra uma entrada por aula", async () => {
      prisma.lesson.create
        .mockResolvedValueOnce({ ...aulaAntes, id: "a" })
        .mockResolvedValueOnce({ ...aulaAntes, id: "b" });

      await service.createBatch(PROFESSOR_ID, {
        date: "2026-09-10",
        lessons: [
          { time: "08:00", type: LessonType.TURMA },
          { time: "09:00", type: LessonType.TURMA },
        ],
      } as any);

      expect(audit.aulaCriada).toHaveBeenCalledTimes(2);
    });

    it("não registra criação quando a aula foi recusada", async () => {
      closingPeriods.assertDateOpen.mockRejectedValue(new ConflictException());

      await expect(
        service.create(PROFESSOR_ID, {
          date: "2026-09-10",
          time: "08:00",
          type: LessonType.TURMA,
        } as any),
      ).rejects.toThrow();
      expect(audit.aulaCriada).not.toHaveBeenCalled();
    });

    it("editar: registra o autor real (o Owner, quando é ele quem edita) com antes e depois", async () => {
      const depois = { ...aulaAntes, time: "09:00" };
      prisma.lesson.findUnique.mockResolvedValue(aulaAntes);
      prisma.lesson.update.mockResolvedValue(depois);

      await service.update("lesson-1", "owner-id", "OWNER", {
        time: "09:00",
      } as any);

      expect(audit.aulaEditada).toHaveBeenCalledWith(
        "owner-id",
        aulaAntes,
        depois,
      );
    });

    it("editar recusado (403) não registra nada", async () => {
      prisma.lesson.findUnique.mockResolvedValue(aulaAntes);

      await expect(
        service.update("lesson-1", "outro", "PROFESSOR", { time: "10:00" } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(audit.aulaEditada).not.toHaveBeenCalled();
    });

    it("excluir: registra a aula como era antes de apagar", async () => {
      prisma.lesson.findUnique.mockResolvedValue(aulaAntes);
      prisma.lesson.delete.mockResolvedValue(aulaAntes);

      await service.remove("lesson-1", PROFESSOR_ID, "PROFESSOR");

      expect(audit.aulaExcluida).toHaveBeenCalledWith(PROFESSOR_ID, aulaAntes);
    });

    it("excluir recusado (período fechado) não registra nada", async () => {
      prisma.lesson.findUnique.mockResolvedValue(aulaAntes);
      closingPeriods.assertDateOpen.mockRejectedValue(new ConflictException());

      await expect(
        service.remove("lesson-1", PROFESSOR_ID, "PROFESSOR"),
      ).rejects.toThrow();
      expect(audit.aulaExcluida).not.toHaveBeenCalled();
    });
  });
});
