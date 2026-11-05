import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: any;

  const OWNER_ID = "owner-1";
  const OTHER_ID = "professor-1";

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe("create", () => {
    const dtoBase = {
      name: "Ana",
      email: "Ana.Silva@Arena.COM",
      password: "senha123",
      role: "PROFESSOR",
    } as any;

    function criadoRetorna(extra: Record<string, unknown> = {}) {
      prisma.user.create.mockImplementation(async ({ data }: any) => ({
        id: "novo-1",
        active: true,
        ...data,
        ...extra,
      }));
    }

    it("grava o e-mail em minúsculas e sem espaços nas pontas", async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      criadoRetorna();

      const user = await service.create({
        ...dtoBase,
        email: "  Ana.Silva@Arena.COM ",
      });

      expect(prisma.user.create.mock.calls[0][0].data.email).toBe(
        "ana.silva@arena.com",
      );
      expect(user.email).toBe("ana.silva@arena.com");
    });

    it("verifica duplicidade pelo e-mail normalizado, comparando com lower(email)", async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      criadoRetorna();

      await service.create(dtoBase);

      const [partes, ...valores] = prisma.$queryRaw.mock.calls[0];
      expect(partes.join("?")).toContain('lower("email") = ?');
      expect(valores).toEqual(["ana.silva@arena.com"]);
    });

    it("409 se já existe o mesmo e-mail com outra caixa (ex.: cadastrado como Ana@x.com)", async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: "existente" }]);

      await expect(service.create(dtoBase)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("guarda a senha como hash e nunca a devolve", async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      criadoRetorna();

      const user = await service.create(dtoBase);

      const gravada = prisma.user.create.mock.calls[0][0].data.password;
      expect(gravada).not.toBe("senha123");
      expect(gravada).toMatch(/^\$2[aby]\$/);
      expect(user).not.toHaveProperty("password");
    });
  });

  describe("update", () => {
    it("impede o usuário de desativar a própria conta", async () => {
      await expect(
        service.update(OWNER_ID, OWNER_ID, { active: false }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("permite desativar a conta de outra pessoa", async () => {
      prisma.user.update.mockResolvedValue({
        id: OTHER_ID,
        name: "Outro",
        email: "x@x.com",
        password: "hash",
        active: false,
      });

      await service.update(OTHER_ID, OWNER_ID, { active: false });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: OTHER_ID },
        data: { active: false },
      });
    });

    it("permite o usuário editar o próprio nome (só não pode se autodesativar)", async () => {
      prisma.user.update.mockResolvedValue({
        id: OWNER_ID,
        name: "Novo Nome",
        email: "x@x.com",
        password: "hash",
        active: true,
      });

      await service.update(OWNER_ID, OWNER_ID, { name: "Novo Nome" });
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("nunca retorna o campo password", async () => {
      prisma.user.update.mockResolvedValue({
        id: OTHER_ID,
        name: "Outro",
        email: "x@x.com",
        password: "hash-secreto",
        active: true,
      });

      const result = await service.update(OTHER_ID, OWNER_ID, {
        name: "Outro",
      });
      expect(result).not.toHaveProperty("password");
    });
  });
});
