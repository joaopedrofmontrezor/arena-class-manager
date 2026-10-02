import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdateUserDto } from "./update-user.dto";
import { describe, it, expect } from "@jest/globals";

async function validateComoNaAplicacao(
  data: Record<string, unknown>,
): Promise<{ valido: boolean; instancia: UpdateUserDto }> {
  const instancia = plainToInstance(UpdateUserDto, data, {
    excludeExtraneousValues: false,
  });
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { valido: erros.length === 0, instancia };
}

describe("UpdateUserDto - prevenção de escalonamento de privilégio", () => {
  it("é válido atualizar apenas o nome", async () => {
    const { valido } = await validateComoNaAplicacao({ name: "Novo Nome" });
    expect(valido).toBe(true);
  });

  it("é válido atualizar apenas o status ativo/inativo", async () => {
    const { valido } = await validateComoNaAplicacao({ active: false });
    expect(valido).toBe(true);
  });

  it("rejeita a requisição quando o payload inclui o campo role (não faz parte do DTO)", async () => {
    const { valido } = await validateComoNaAplicacao({
      name: "Tentando Virar Owner",
      role: "OWNER",
    });
    expect(valido).toBe(false);
  });

  it("rejeita a requisição quando o payload inclui password diretamente (fora do fluxo de reset)", async () => {
    const { valido } = await validateComoNaAplicacao({
      password: "novaSenha123",
    });
    expect(valido).toBe(false);
  });
});
