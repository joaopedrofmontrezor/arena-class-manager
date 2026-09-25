import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from "class-validator";

import { LessonType } from "@prisma/client";
import { IsTimeHHMM } from "../../common/validators/is-time.validator";
import { IsDateOnly } from "../../common/validators/is-date-only.validator";
import { VALOR_PERSONAL_MAXIMO } from "../lessons.constants";

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
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(VALOR_PERSONAL_MAXIMO)
  professorValue?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}
