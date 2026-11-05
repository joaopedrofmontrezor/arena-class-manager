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

  function dbRetorna(usuario: unknown) {
    prisma.$queryRaw.mockResolvedValue(usuario ? [usuario] : []);
  }

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
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
    dbRetorna({
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
    dbRetorna({
      ...usuarioBase,
      password: hashSenhaCorreta,
    });

    const result = await service.login(usuarioBase.email, SENHA_PLANA);

    expect(result.user).not.toHaveProperty("password");
  });

  it("rejeita login com senha incorreta", async () => {
    dbRetorna({
      ...usuarioBase,
      password: hashSenhaCorreta,
    });

    await expect(
      service.login(usuarioBase.email, "senha-errada"),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("rejeita login para usuário inexistente", async () => {
    dbRetorna(null);

    await expect(
      service.login("ninguem@arena.com", SENHA_PLANA),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("rejeita login para usuário inativo, mesmo com a senha correta", async () => {
    dbRetorna({
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
    dbRetorna(null);
    let erroUsuarioInexistente: string | undefined;
    try {
      await service.login("ninguem@arena.com", SENHA_PLANA);
    } catch (e) {
      erroUsuarioInexistente = (e as UnauthorizedException).message;
    }

    dbRetorna({
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

  describe("e-mail sem diferenciar maiúsculas/minúsculas", () => {
    it("busca pelo e-mail normalizado (minúsculas, sem espaços) comparando com lower(email)", async () => {
      dbRetorna({ ...usuarioBase, password: hashSenhaCorreta });

      await service.login("  Professor@ARENA.com ", SENHA_PLANA);

      const [partes, ...valores] = prisma.$queryRaw.mock.calls[0];
      expect(partes.join("?")).toContain('lower("email") = ?');
      expect(valores).toEqual(["professor@arena.com"]);
    });

    it("entra normalmente mesmo digitando o e-mail todo em maiúsculas", async () => {
      dbRetorna({
        ...usuarioBase,
        password: hashSenhaCorreta,
      });

      const result = await service.login("PROFESSOR@ARENA.COM", SENHA_PLANA);

      expect(result.accessToken).toBe("token.jwt.assinado");
    });

    it("conta antiga gravada com maiúsculas continua conseguindo entrar", async () => {
      dbRetorna({
        ...usuarioBase,
        email: "Professor@Arena.com",
        password: hashSenhaCorreta,
      });

      const result = await service.login("professor@arena.com", SENHA_PLANA);

      expect(result.user.email).toBe("Professor@Arena.com");
    });

    it("não troca de usuário: senha errada continua sendo recusada com e-mail em outra caixa", async () => {
      dbRetorna({
        ...usuarioBase,
        password: hashSenhaCorreta,
      });

      await expect(
        service.login("PROFESSOR@arena.com", "senha-errada"),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
