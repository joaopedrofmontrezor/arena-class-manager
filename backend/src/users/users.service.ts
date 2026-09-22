import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existente = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existente) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

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
      orderBy: { name: 'asc' },
    });
  }

  
  findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async resetPassword(id: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hash } });
    return { ok: true };
  }
}
