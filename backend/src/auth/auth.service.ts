import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { findUserByEmail } from "../users/find-user-by-email";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await findUserByEmail(this.prisma, email);
    if (!user || !user.active) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const payload = { sub: user.id, role: user.role, name: user.name };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
