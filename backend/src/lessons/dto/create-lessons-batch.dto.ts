import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { LessonType } from "@prisma/client";
import { IsDateOnly } from "../../common/validators/is-date-only.validator";
import { IsTimeHHMM } from "../../common/validators/is-time.validator";
import { VALOR_PERSONAL_MAXIMO } from "../lessons.constants";

export const MAX_AULAS_POR_LOTE = 10;

export class BatchLessonItemDto {
  @IsTimeHHMM({ message: "time deve estar no formato HH:mm." })
  time!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsOptional()
  @IsString()
  assistantId?: string | null;

  @ValidateIf((dto: BatchLessonItemDto) => dto.type === LessonType.PERSONAL)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(VALOR_PERSONAL_MAXIMO)
  professorValue?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class CreateLessonsBatchDto {
  @IsDateOnly()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_AULAS_POR_LOTE)
  @ValidateNested({ each: true })
  @Type(() => BatchLessonItemDto)
  lessons!: BatchLessonItemDto[];
}
