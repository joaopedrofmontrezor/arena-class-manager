import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { LessonType } from "@prisma/client";

export class UpdateLessonDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @IsOptional()
  @IsString()
  assistantId?: string;

  @IsOptional()
  @IsNumber()
  professorValue?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}
