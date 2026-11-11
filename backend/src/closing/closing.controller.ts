import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClosingService } from "./closing.service";
import { ClosingPeriodsService } from "./closing-periods.service";
import { ClosingExportService } from "./closing-export.service";
import { ClosePeriodDto } from "./dto/close-period.dto";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { getPeriodoAtual, Periodo } from "./period.util";
import { PeriodoQueryDto } from "../common/dto/periodo-query.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("closing")
export class ClosingController {
  constructor(
    private closingService: ClosingService,
    private closingPeriods: ClosingPeriodsService,
    private closingExport: ClosingExportService,
  ) {}

  @Get("me")
  async getMine(
    @CurrentUser() user: CurrentUserData,
    @Query() query: PeriodoQueryDto,
  ) {
    const periodo = this.resolvePeriodo(query);
    const resumo = await this.closingService.getResumoProfessor(
      user.userId,
      periodo,
    );
    return this.closingPeriods.withStatusProfessor(resumo, user.userId);
  }

  @Get("general")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  async getGeneral(@Query() query: PeriodoQueryDto) {
    const periodo = this.resolvePeriodo(query);
    const resumo = await this.closingService.getResumoGeral(periodo);
    return this.closingPeriods.withStatusGeral(resumo);
  }

  @Get("professor/:id")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  async getByProfessor(
    @Param("id") id: string,
    @Query() query: PeriodoQueryDto,
  ) {
    const periodo = this.resolvePeriodo(query);
    const resumo = await this.closingService.getResumoProfessor(id, periodo);
    return this.closingPeriods.withStatusProfessor(resumo, id);
  }

  @Get("me/export")
  async exportMine(
    @CurrentUser() user: CurrentUserData,
    @Query() query: PeriodoQueryDto,
  ) {
    const periodo = this.resolvePeriodo(query);
    const texto = await this.closingExport.textoProfessor(
      user.userId,
      user.name,
      periodo,
    );
    return { texto };
  }

  @Get("general/export")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  async exportGeneral(@Query() query: PeriodoQueryDto) {
    const periodo = this.resolvePeriodo(query);
    return { texto: await this.closingExport.textoGeral(periodo) };
  }

  @Get("professor/:id/export")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  async exportProfessor(
    @Param("id") id: string,
    @Query() query: PeriodoQueryDto,
  ) {
    const periodo = this.resolvePeriodo(query);
    return { texto: await this.closingExport.textoProfessorPorId(id, periodo) };
  }

  @Post("periods")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  closePeriod(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ClosePeriodDto,
  ) {
    return this.closingPeriods.close(user.userId, dto.start);
  }

  @Delete("periods/:id")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  reopenPeriod(@Param("id") id: string) {
    return this.closingPeriods.reopen(id);
  }

  @Post("periods/:id/payments/:professorId")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  markPaid(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Param("professorId") professorId: string,
  ) {
    return this.closingPeriods.markPaid(user.userId, id, professorId);
  }

  @Delete("periods/:id/payments/:professorId")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  unmarkPaid(@Param("id") id: string, @Param("professorId") professorId: string) {
    return this.closingPeriods.unmarkPaid(id, professorId);
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
