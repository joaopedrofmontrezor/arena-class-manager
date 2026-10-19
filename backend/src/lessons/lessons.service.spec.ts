import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { LessonsService } from "./lessons.service";
import { PrismaService } from "../prisma/prisma.service";
import { LessonType, Role } from "@prisma/client";

describe("LessonsService", () => {
  let service: LessonsService;

  let prisma: any;

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

    const moduleRef = await Test.createTestingModule({
      providers: [LessonsService, { provide: PrismaService, useValue: prisma }],
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
});
