import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClosingService } from "./closing.service";
import { CurrentUser, CurrentUserData } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { getPeriodoAtual, Periodo } from "./period.util";
import { PeriodoQueryDto } from "../common/dto/periodo-query.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("closing")
export class ClosingController {
  constructor(private closingService: ClosingService) {}

  @Get("me")
  getMine(@CurrentUser() user: CurrentUserData, @Query() query: PeriodoQueryDto) {
    const periodo = this.resolvePeriodo(query);
    return this.closingService.getResumoProfessor(user.userId, periodo);
  }

  @Get("general")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  getGeneral(@Query() query: PeriodoQueryDto) {
    const periodo = this.resolvePeriodo(query);
    return this.closingService.getResumoGeral(periodo);
  }

  @Get("professor/:id")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  getByProfessor(@Param("id") id: string, @Query() query: PeriodoQueryDto) {
    const periodo = this.resolvePeriodo(query);
    return this.closingService.getResumoProfessor(id, periodo);
  }

  private resolvePeriodo(query: PeriodoQueryDto): Periodo | undefined {
    
    if (!query.start || !query.end) return undefined;

    const canonico = getPeriodoAtual(new Date(query.start));
    return {
      start: new Date(query.start),
      end: new Date(query.end),
      label: canonico.label,
    };
  }
}
