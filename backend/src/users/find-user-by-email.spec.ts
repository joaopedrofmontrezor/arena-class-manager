import { describe, it, expect, jest } from "@jest/globals";
import { findUserByEmail } from "./find-user-by-email";

function prismaCom(linhas: unknown[]) {
  return { $queryRaw: jest.fn().mockResolvedValue(linhas as never) } as any;
}

describe("findUserByEmail", () => {
  it("devolve o usuário quando existe", async () => {
    const usuario = { id: "1", email: "ana@x.com" };
    const prisma = prismaCom([usuario]);

    await expect(findUserByEmail(prisma, "ana@x.com")).resolves.toBe(usuario);
  });

  it("devolve null quando não existe", async () => {
    await expect(findUserByEmail(prismaCom([]), "ninguem@x.com")).resolves.toBe(
      null,
    );
  });

  it("normaliza o e-mail (minúsculas e sem espaços) antes de consultar", async () => {
    const prisma = prismaCom([]);

    await findUserByEmail(prisma, "  Ana.Silva@X.COM ");

    const [, ...valores] = prisma.$queryRaw.mock.calls[0];
    expect(valores).toEqual(["ana.silva@x.com"]);
  });

  it("compara os DOIS lados em minúsculas (para achar contas antigas com maiúsculas)", async () => {
    const prisma = prismaCom([]);

    await findUserByEmail(prisma, "ana@x.com");

    const [partes] = prisma.$queryRaw.mock.calls[0];
    expect((partes as string[]).join("?")).toContain('lower("email") = ?');
  });

  it("NÃO usa LIKE/ILIKE: '_' e '%' do e-mail não podem virar curingas", async () => {
    const prisma = prismaCom([]);

    await findUserByEmail(prisma, "joao_silva%@x.com");

    const [partes, ...valores] = prisma.$queryRaw.mock.calls[0];
    const sql = (partes as string[]).join("?").toUpperCase();
    expect(sql).not.toContain("LIKE");

    expect(valores).toEqual(["joao_silva%@x.com"]);
    expect(sql).not.toContain("JOAO_SILVA");
  });

  it("o e-mail vai como parâmetro, nunca dentro do texto do SQL (sem injeção)", async () => {
    const prisma = prismaCom([]);
    const malicioso = "x@x.com' OR '1'='1";

    await findUserByEmail(prisma, malicioso);

    const [partes, ...valores] = prisma.$queryRaw.mock.calls[0];
    expect((partes as string[]).join("?")).not.toContain("OR '1'='1'");
    expect(valores).toEqual([malicioso.toLowerCase()]);
  });

  it("pega só uma linha, a mais antiga, se houver duplicatas só na caixa", async () => {
    const prisma = prismaCom([]);

    await findUserByEmail(prisma, "ana@x.com");

    const [partes] = prisma.$queryRaw.mock.calls[0];
    const sql = (partes as string[]).join("?");
    expect(sql).toContain('ORDER BY "createdAt" ASC');
    expect(sql).toContain("LIMIT 1");
  });
});
