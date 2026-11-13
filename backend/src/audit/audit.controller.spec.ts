import { describe, it, expect, jest } from "@jest/globals";
import { AuditController, LIMITE_PADRAO_AUDITORIA } from "./audit.controller";
import { ROLES_KEY } from "../auth/decorators/roles.decorator";

describe("AuditController", () => {
  it("só o OWNER pode consultar o histórico", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual(["OWNER"]);
  });

  it("converte os filtros e aplica o limite padrão", async () => {
    const audit = { listar: jest.fn(async () => ({ itens: [], proximoCursor: null })) };
    const controller = new AuditController(audit as any);

    await controller.listar({
      periodStart: "2026-11-01",
      professorId: "p1",
    });

    expect(audit.listar).toHaveBeenCalledWith({
      periodStart: new Date("2026-11-01"),
      professorId: "p1",
      cursor: undefined,
      limite: LIMITE_PADRAO_AUDITORIA,
    });
  });

  it("respeita o limit informado e o cursor", async () => {
    const audit = { listar: jest.fn(async () => ({ itens: [], proximoCursor: null })) };
    const controller = new AuditController(audit as any);

    await controller.listar({ limit: 5, cursor: "abc" });

    expect(audit.listar).toHaveBeenCalledWith({
      periodStart: undefined,
      professorId: undefined,
      cursor: "abc",
      limite: 5,
    });
  });
});
