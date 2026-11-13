import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { IsDateOnly } from "../../common/validators/is-date-only.validator";

export class AuditQueryDto {
  /** Início da quinzena (dia 1 ou 16) para filtrar. */
  @IsOptional()
  @IsDateOnly()
  periodStart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  professorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
