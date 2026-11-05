import { describe, it, expect } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "./login.dto";

async function comoNaAplicacao(data: Record<string, unknown>) {
  const instancia = plainToInstance(LoginDto, data);
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { valido: erros.length === 0, instancia };
}

describe("LoginDto", () => {
  it("normaliza o e-mail para minúsculas", async () => {
    const { valido, instancia } = await comoNaAplicacao({
      email: "Professor@ARENA.com",
      password: "senha123",
    });
    expect(valido).toBe(true);
    expect(instancia.email).toBe("professor@arena.com");
  });

  it("aceita e-mail com espaços nas pontas (colar do WhatsApp/e-mail)", async () => {
    const { valido, instancia } = await comoNaAplicacao({
      email: "  professor@arena.com  ",
      password: "senha123",
    });
    expect(valido).toBe(true);
    expect(instancia.email).toBe("professor@arena.com");
  });

  it("continua rejeitando e-mail inválido", async () => {
    const { valido } = await comoNaAplicacao({
      email: "nao-e-um-email",
      password: "senha123",
    });
    expect(valido).toBe(false);
  });

  it("continua rejeitando e-mail que não é texto", async () => {
    const { valido } = await comoNaAplicacao({
      email: 12345,
      password: "senha123",
    });
    expect(valido).toBe(false);
  });

  it("NÃO altera a senha (maiúsculas e espaços fazem parte dela)", async () => {
    const { instancia } = await comoNaAplicacao({
      email: "a@b.com",
      password: " SenhaCOM Espaço ",
    });
    expect(instancia.password).toBe(" SenhaCOM Espaço ");
  });
});
