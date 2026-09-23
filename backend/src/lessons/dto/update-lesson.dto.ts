import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

import { LessonType } from "@prisma/client";
import { IsTimeHHMM } from "../../common/validators/is-time.validator";
import { IsDateOnly } from "../../common/validators/is-date-only.validator";

export class UpdateLessonDto {
  @IsOptional()
  @IsDateOnly()
  date?: string;

  @IsOptional()
  @IsTimeHHMM()
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
