import { describe, it, expect } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

async function comoNaAplicacao(data: Record<string, unknown>) {
  const instancia = plainToInstance(CreateUserDto, data);
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { valido: erros.length === 0, instancia };
}

const base = { name: "Ana", password: "senha123", role: "PROFESSOR" };

describe("CreateUserDto", () => {
  it("normaliza o e-mail (minúsculas e sem espaços)", async () => {
    const { valido, instancia } = await comoNaAplicacao({
      ...base,
      email: "  Ana.Silva@Arena.COM ",
    });
    expect(valido).toBe(true);
    expect(instancia.email).toBe("ana.silva@arena.com");
  });

  it("continua rejeitando e-mail inválido", async () => {
    const { valido } = await comoNaAplicacao({ ...base, email: "ana@" });
    expect(valido).toBe(false);
  });

  it("continua exigindo e-mail", async () => {
    const { valido } = await comoNaAplicacao({ ...base });
    expect(valido).toBe(false);
  });

  it("não altera nome nem senha", async () => {
    const { instancia } = await comoNaAplicacao({
      ...base,
      name: "Ana  MARIA",
      password: "SenhaCOM123",
      email: "a@b.com",
    });
    expect(instancia.name).toBe("Ana  MARIA");
    expect(instancia.password).toBe("SenhaCOM123");
  });
});
