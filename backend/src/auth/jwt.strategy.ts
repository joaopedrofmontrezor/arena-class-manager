import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { Role } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { requireJwtSecret } from "./jwt-secret";

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
}

function cookieExtractor(req: Request): string | null {
  return req.cookies?.token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<{
    userId: string;
    role: Role;
    name: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException("Sessão inválida ou usuário desativado");
    }

    return {
      userId: user.id,
      role: user.role,
      name: user.name,
    };
  }
}
