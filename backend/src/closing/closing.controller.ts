import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
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
    const periodo = this.resolvePeriodo(start, end);
    return this.closingService.getResumoProfessor(user.userId, periodo);
  }

  @Get("general")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  getGeneral(@Query("start") start?: string, @Query("end") end?: string) {
    const periodo = this.resolvePeriodo(start, end);
    return this.closingService.getResumoGeral(periodo);
  }

  @Get("professor/:id")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  getByProfessor(
    @Param("id") id: string,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    const periodo = this.resolvePeriodo(start, end);
    return this.closingService.getResumoProfessor(id, periodo);
  }

  private resolvePeriodo(start?: string, end?: string) {
    if (!start || !end) return undefined;
    const canonico = getPeriodoAtual(new Date(start));
    return {
      start: new Date(start),
      end: new Date(end),
      label: canonico.label,
    };
  }
}
