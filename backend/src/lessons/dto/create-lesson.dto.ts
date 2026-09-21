import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import { LessonType } from "@prisma/client";

export class CreateLessonDto {
  @IsDateString()
  date!: string;

  @IsString()
  time!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsString()
  assistantId!: string;

  @ValidateIf((dto) => dto.type === LessonType.PERSONAL)
  @IsNumber()
  professorValue?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}
