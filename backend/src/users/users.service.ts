import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hash },
    });
    const { password, ...safeUser } = user;
    return safeUser;
  }

  findAllProfessors() {
    return this.prisma.user.findMany({
      where: { role: Role.PROFESSOR, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role, active: true } : { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
  }
}
