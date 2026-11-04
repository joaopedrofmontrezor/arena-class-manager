import { IsDateOnly } from "../../common/validators/is-date-only.validator";

export class ClosePeriodDto {
  
  @IsDateOnly()
  start!: string;
}
