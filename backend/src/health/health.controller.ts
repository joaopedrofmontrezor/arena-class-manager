import { Controller, Get, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(200);
      return { status: "ok", database: "up" };
    } catch {
      res.status(503);
      return { status: "error", database: "down" };
    }
  }
}
