import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  beforeAll,
} from "@jest/globals";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  const SENHA_PLANA = "senha-correta-123";
  let hashSenhaCorreta: string;

  const usuarioBase = {
    id: "user-1",
    name: "Professor Teste",
    email: "professor@arena.com",
    role: "PROFESSOR",
    active: true,
  };

  beforeAll(async () => {
    hashSenhaCorreta = await bcrypt.hash(SENHA_PLANA, 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    jwt = {
      sign: jest.fn().mockReturnValue("token.jwt.assinado"),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it("realiza login com sucesso quando email e senha estão corretos", async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...usuarioBase,
      password: hashSenhaCorreta,
    });

    const result = await service.login(usuarioBase.email, SENHA_PLANA);

    expect(result.accessToken).toBe("token.jwt.assinado");
    expect(result.user).toEqual({
      id: usuarioBase.id,
      name: usuarioBase.name,
      email: usuarioBase.email,
      role: usuarioBase.role,
    });
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: usuarioBase.id,
      role: usuarioBase.role,
      name: usuarioBase.name,
    });
  });

  it("nunca inclui o hash da senha no retorno do login", async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...usuarioBase,
      password: hashSenhaCorreta,
    });

    const result = await service.login(usuarioBase.email, SENHA_PLANA);

    expect(result.user).not.toHaveProperty("password");
  });

  it("rejeita login com senha incorreta", async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...usuarioBase,
      password: hashSenhaCorreta,
    });

    await expect(
      service.login(usuarioBase.email, "senha-errada"),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("rejeita login para usuário inexistente", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login("ninguem@arena.com", SENHA_PLANA),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("rejeita login para usuário inativo, mesmo com a senha correta", async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...usuarioBase,
      active: false,
      password: hashSenhaCorreta,
    });

    await expect(service.login(usuarioBase.email, SENHA_PLANA)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("usa a mesma mensagem de erro para usuário inexistente e senha errada (não revela qual campo falhou)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    let erroUsuarioInexistente: string | undefined;
    try {
      await service.login("ninguem@arena.com", SENHA_PLANA);
    } catch (e) {
      erroUsuarioInexistente = (e as UnauthorizedException).message;
    }

    prisma.user.findUnique.mockResolvedValue({
      ...usuarioBase,
      password: hashSenhaCorreta,
    });
    let erroSenhaErrada: string | undefined;
    try {
      await service.login(usuarioBase.email, "senha-errada");
    } catch (e) {
      erroSenhaErrada = (e as UnauthorizedException).message;
    }

    expect(erroUsuarioInexistente).toBe(erroSenhaErrada);
  });
});
