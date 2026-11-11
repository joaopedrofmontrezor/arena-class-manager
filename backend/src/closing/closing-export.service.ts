import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ClosingService } from "./closing.service";
import { ClosingPeriodsService } from "./closing-periods.service";
import { Periodo } from "./period.util";
import {
  formatarFechamentoGeral,
  formatarFechamentoProfessor,
} from "./closing-export.formatter";

@Injectable()
export class ClosingExportService {
  constructor(
    private prisma: PrismaService,
    private closing: ClosingService,
    private periods: ClosingPeriodsService,
  ) {}

  async textoProfessor(
    professorId: string,
    nome: string,
    periodo?: Periodo,
  ): Promise<string> {
    const resumo = await this.closing.getResumoProfessor(professorId, periodo);
    const comStatus = await this.periods.withStatusProfessor(
      resumo,
      professorId,
    );
    return formatarFechamentoProfessor(nome, comStatus);
  }

  async textoProfessorPorId(
    professorId: string,
    periodo?: Periodo,
  ): Promise<string> {
    const professor = await this.prisma.user.findUnique({
      where: { id: professorId },
      select: { name: true },
    });
    if (!professor) throw new NotFoundException("Professor não encontrado.");

    return this.textoProfessor(professorId, professor.name, periodo);
  }

  async textoGeral(periodo?: Periodo): Promise<string> {
    const geral = await this.closing.getResumoGeral(periodo);
    const comStatus = await this.periods.withStatusGeral(geral);

    const detalhes = await Promise.all(
      geral.professores.map(async (p) => ({
        professorId: p.professorId,
        resumo: await this.periods.withStatusProfessor(
          await this.closing.getResumoProfessor(p.professorId, geral.periodo),
          p.professorId,
        ),
      })),
    );

    return formatarFechamentoGeral(comStatus, detalhes);
  }
}
