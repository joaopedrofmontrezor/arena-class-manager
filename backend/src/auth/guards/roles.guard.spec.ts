import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as Reflector);
  });

  function mockContext(userRole?: string): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it("permite acesso quando a rota não exige nenhum papel específico", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(mockContext("PROFESSOR"))).toBe(true);
  });

  it("permite acesso quando a lista de papéis exigidos está vazia", () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(mockContext("PROFESSOR"))).toBe(true);
  });

  it("permite acesso ao OWNER em uma rota restrita a OWNER", () => {
    reflector.getAllAndOverride.mockReturnValue(["OWNER"]);

    expect(guard.canActivate(mockContext("OWNER"))).toBe(true);
  });

  it("nega acesso ao PROFESSOR em uma rota restrita a OWNER", () => {
    reflector.getAllAndOverride.mockReturnValue(["OWNER"]);

    expect(guard.canActivate(mockContext("PROFESSOR"))).toBe(false);
  });

  it("nega acesso quando não há usuário autenticado na requisição", () => {
    reflector.getAllAndOverride.mockReturnValue(["OWNER"]);

    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });

  it("consulta tanto o handler quanto a classe para decidir os papéis exigidos", () => {
    reflector.getAllAndOverride.mockReturnValue(["OWNER"]);
    const context = mockContext("OWNER");

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
