import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
