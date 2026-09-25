import {
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { IsDateOnly } from "../validators/is-date-only.validator";

@ValidatorConstraint({ name: "startBeforeOrEqualEnd", async: false })
class StartBeforeOrEqualEndConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as PeriodoQueryDto;
    if (!obj.start || !obj.end) return true;

    return obj.start <= obj.end;
  }

  defaultMessage(): string {
    return "A data de início (start) não pode ser depois da data de fim (end).";
  }
}

@ValidatorConstraint({ name: "bothOrNeither", async: false })
class BothOrNeitherConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as PeriodoQueryDto;
    return Boolean(obj.start) === Boolean(obj.end);
  }

  defaultMessage(): string {
    return "Informe start e end juntos, ou nenhum dos dois (para usar o período atual).";
  }
}

export class PeriodoQueryDto {
  @IsOptional()
  @IsDateOnly()
  @Validate(BothOrNeitherConstraint)
  start?: string;

  @IsOptional()
  @IsDateOnly()
  @Validate(BothOrNeitherConstraint)
  @Validate(StartBeforeOrEqualEndConstraint)
  end?: string;
}
