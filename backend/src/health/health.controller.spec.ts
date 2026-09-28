import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("HealthController", () => {
  let controller: HealthController;

  let prisma: any;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  function mockResponse() {
    const status = jest.fn().mockReturnThis();
    return { status } as unknown as import("express").Response;
  }

  it('retorna status "ok" e HTTP 200 quando o banco responde', async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = mockResponse();

    const result = await controller.check(res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(result).toEqual({ status: "ok", database: "up" });
  });

  it('retorna status "error" e HTTP 503 quando o banco falha', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));
    const res = mockResponse();

    const result = await controller.check(res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(result).toEqual({ status: "error", database: "down" });
  });
});
