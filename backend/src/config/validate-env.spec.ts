import { validateEnv } from "./validate-env";
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

describe("validateEnv", () => {
  const originalEnv = { ...process.env };
  let exitSpy: ReturnType<typeof jest.spyOn>;
  let errorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitSpy = jest.spyOn(process, "exit").mockImplementation(((): never => {
      throw new Error("process.exit chamado");
    }) as never);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("passa quando todas as variáveis obrigatórias estão presentes (dev)", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    delete process.env.FRONTEND_URL;

    expect(() => validateEnv()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("falha se DATABASE_URL estiver ausente", () => {
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";

    expect(() => validateEnv()).toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("falha em produção se FRONTEND_URL estiver ausente", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    delete process.env.FRONTEND_URL;

    expect(() => validateEnv()).toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("passa em produção quando FRONTEND_URL está configurada", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.FRONTEND_URL = "https://app.exemplo.com";

    expect(() => validateEnv()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
