import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class RoleQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
