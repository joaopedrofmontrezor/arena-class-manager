import { describe, it, expect } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { NormalizeEmail, normalizeEmail } from "./normalize-email";

describe("normalizeEmail", () => {
  it("converte para minúsculas", () => {
    expect(normalizeEmail("Joao@Arena.COM")).toBe("joao@arena.com");
  });

  it("remove espaços e quebras de linha nas pontas", () => {
    expect(normalizeEmail("  joao@arena.com \n")).toBe("joao@arena.com");
  });

  it("não mexe no que já está normalizado", () => {
    expect(normalizeEmail("joao@arena.com")).toBe("joao@arena.com");
  });

  it("preserva o que está no meio (pontos, +, números)", () => {
    expect(normalizeEmail("Joao.Silva+Arena2@X.com")).toBe(
      "joao.silva+arena2@x.com",
    );
  });
});

describe("@NormalizeEmail()", () => {
  class Exemplo {
    @NormalizeEmail()
    email!: unknown;
  }

  it("normaliza o campo ao transformar o objeto", () => {
    const obj = plainToInstance(Exemplo, { email: " A@B.com " });
    expect(obj.email).toBe("a@b.com");
  });

  it("deixa passar intactos valores que não são texto (a validação os rejeita depois)", () => {
    expect(plainToInstance(Exemplo, { email: 123 }).email).toBe(123);
    expect(plainToInstance(Exemplo, { email: null }).email).toBeNull();
    expect(plainToInstance(Exemplo, { email: undefined }).email).toBeUndefined();
  });
});
