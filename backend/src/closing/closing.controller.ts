import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClosingService } from "./closing.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { getPeriodoAtual } from "./period.util";

@UseGuards(AuthGuard("jwt"))
@Controller("closing")
export class ClosingController {
  constructor(private closingService: ClosingService) {}

  @Get("me")
  getMine(
    @CurrentUser() user,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    const periodo =
      start && end ? this.buildCustomPeriodo(start, end) : undefined;
    return this.closingService.getResumoProfessor(user.userId, periodo);
  }

  @Get("general")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  getGeneral(@Query("start") start?: string, @Query("end") end?: string) {
    const periodo =
      start && end ? this.buildCustomPeriodo(start, end) : undefined;
    return this.closingService.getResumoGeral(periodo);
  }

  private buildCustomPeriodo(start: string, end: string) {
    const { label } = getPeriodoAtual(new Date(start));
    return { start: new Date(start), end: new Date(end), label };
  }
}
