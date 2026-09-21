import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LessonType, Role } from "@prisma/client";
import { getPeriodoAtual, Periodo } from "./period.util";

@Injectable()
export class ClosingService {
  constructor(private prisma: PrismaService) {}

  async getResumoProfessor(professorId: string, periodo?: Periodo) {
    const { start, end, label } = periodo ?? getPeriodoAtual();

    const [aulasComoProfessor, aulasComoAuxiliar] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { professorId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
      }),
      this.prisma.lesson.findMany({
        where: { assistantId: professorId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        include: { professor: { select: { name: true } } },
      }),
    ]);

    const turmas = aulasComoProfessor.filter(
      (a) => a.type === LessonType.TURMA,
    );
    const personais = aulasComoProfessor.filter(
      (a) => a.type === LessonType.PERSONAL,
    );

    const valorAulas = aulasComoProfessor.reduce(
      (soma, a) => soma + Number(a.professorValue),
      0,
    );
    const valorComoAuxiliar = aulasComoAuxiliar.reduce(
      (soma, a) => soma + Number(a.assistantValue),
      0,
    );

    return {
      periodo: { start, end, label },
      totalTurmas: turmas.length,
      totalPersonais: personais.length,
      valorAulas,
      valorComoAuxiliar,
      totalReceber: valorAulas + valorComoAuxiliar,
      aulas: aulasComoProfessor,
      aulasComoAuxiliar,
    };
  }

  async getResumoGeral(periodo?: Periodo) {
    const p = periodo ?? getPeriodoAtual();

    const professores = await this.prisma.user.findMany({
      where: { role: Role.PROFESSOR, active: true },
      orderBy: { name: "asc" },
    });

    const resumos = await Promise.all(
      professores.map(async (professor) => {
        const resumo = await this.getResumoProfessor(professor.id, p);
        return {
          professorId: professor.id,
          nome: professor.name,
          totalAulas: resumo.totalTurmas + resumo.totalPersonais,
          valorAulas: resumo.valorAulas,
          valorComoAuxiliar: resumo.valorComoAuxiliar,
          totalReceber: resumo.totalReceber,
        };
      }),
    );

    return { periodo: p, professores: resumos };
  }
}
