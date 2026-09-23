import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { Role } from "@prisma/client";

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
  constructor() {
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
    return {
      userId: payload.sub,
      role: payload.role,
      name: payload.name,
    };
  }
}
