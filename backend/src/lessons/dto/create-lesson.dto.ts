import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  ValidateIf,
} from "class-validator";
import { IsDateOnly } from "../../common/validators/is-date-only.validator";

import { LessonType } from "@prisma/client";
import { IsTimeHHMM } from "../../common/validators/is-time.validator";
import { VALOR_PERSONAL_MAXIMO } from "../lessons.constants";

export class CreateLessonDto {
  @IsDateOnly()
  date!: string;

  @IsTimeHHMM({
    message: "time deve estar no formato HH:mm.",
  })
  time!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsString()
  assistantId!: string;

  @ValidateIf((dto: CreateLessonDto) => dto.type === LessonType.PERSONAL)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(VALOR_PERSONAL_MAXIMO)
  professorValue?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}
