import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
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
