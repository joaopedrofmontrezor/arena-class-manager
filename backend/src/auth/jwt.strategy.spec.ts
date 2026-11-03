import { UnauthorizedException } from "@nestjs/common";
import {
  describe,
  it,
  expect,
  jest,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy.validate", () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock<(...args: any[]) => any> } };

  const secretOriginal = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-16-caracteres";
  });

  afterAll(() => {
    if (secretOriginal === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = secretOriginal;
    }
  });

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    strategy = new JwtStrategy(prisma as any);
  });

  const payload = { sub: "user-1", role: "PROFESSOR" as const, name: "Token" };

  it("aceita um usuário ativo e devolve os dados vindos do banco", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Professor Teste",
      role: "PROFESSOR",
      active: true,
    });

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: "user-1",
      role: "PROFESSOR",
      name: "Professor Teste",
    });
  });

  it("consulta o usuário pelo id (sub) do token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Professor Teste",
      role: "PROFESSOR",
      active: true,
    });

    await strategy.validate(payload);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, name: true, role: true, active: true },
    });
  });

  it("recusa (401) um usuário desativado, mesmo com token ainda válido", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Professor Teste",
      role: "PROFESSOR",
      active: false,
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("recusa (401) quando o usuário não existe mais no banco", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("usa o papel ATUAL do banco, não o que está congelado no token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Professor Teste",
      role: "PROFESSOR",
      active: true,
    });

    const resultado = await strategy.validate({
      sub: "user-1",
      role: "OWNER",
      name: "Token",
    });

    expect(resultado.role).toBe("PROFESSOR");
  });

  it("usa o nome ATUAL do banco, não o do token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Nome Atualizado",
      role: "PROFESSOR",
      active: true,
    });

    const resultado = await strategy.validate(payload);

    expect(resultado.name).toBe("Nome Atualizado");
  });

  it("não engole falhas do banco: propaga o erro em vez de liberar o acesso", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("banco indisponível"));

    await expect(strategy.validate(payload)).rejects.toThrow(
      "banco indisponível",
    );
  });
});
