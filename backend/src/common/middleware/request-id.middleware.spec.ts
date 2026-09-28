import { Request, Response } from "express";
import {
  requestIdMiddleware,
  REQUEST_ID_HEADER,
} from "./request-id.middleware";
import { describe, it, expect, jest } from "@jest/globals";

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Request;
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Response;
  const next = jest.fn();
  return { req, res, next, setHeader };
}

describe("requestIdMiddleware", () => {
  it("gera um novo ID quando não vem nenhum no header", () => {
    const { req, res, next, setHeader } = mockReqRes();

    requestIdMiddleware(req, res, next);

    expect(typeof req.id).toBe("string");
    expect((req.id as string).length).toBeGreaterThan(0);
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("reaproveita o ID enviado por um proxy/load balancer upstream", () => {
    const { req, res, next } = mockReqRes({
      [REQUEST_ID_HEADER]: "id-existente-123",
    });

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe("id-existente-123");
  });

  it("ignora um header vazio e gera um novo ID", () => {
    const { req, res, next } = mockReqRes({ [REQUEST_ID_HEADER]: "   " });

    requestIdMiddleware(req, res, next);

    expect(req.id).not.toBe("   ");
    expect((req.id as string).trim().length).toBeGreaterThan(0);
  });

  it("gera IDs diferentes em chamadas sucessivas sem header", () => {
    const first = mockReqRes();
    const second = mockReqRes();

    requestIdMiddleware(first.req, first.res, first.next);
    requestIdMiddleware(second.req, second.res, second.next);

    expect(first.req.id).not.toBe(second.req.id);
  });
});
