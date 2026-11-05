import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { Role } from "@prisma/client";
import { NormalizeEmail } from "../../common/transformers/normalize-email";

export class CreateUserDto {
  @IsString()
  name!: string;

  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
