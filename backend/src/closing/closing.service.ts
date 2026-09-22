import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LessonType } from "@prisma/client";
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
        include: { assistant: { select: { id: true, name: true } } },
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

    const [professoresAtivos, idsComAulaNoPeriodo] = await Promise.all([
      this.prisma.user.findMany({ where: { role: "PROFESSOR", active: true } }),
      this.prisma.lesson.findMany({
        where: { date: { gte: p.start, lte: p.end } },
        select: { professorId: true, assistantId: true },
      }),
    ]);

    const idsRelevantes = new Set<string>(professoresAtivos.map((u) => u.id));
    for (const l of idsComAulaNoPeriodo) {
      idsRelevantes.add(l.professorId);
      idsRelevantes.add(l.assistantId);
    }

    const professoresRelevantes = await this.prisma.user.findMany({
      where: { id: { in: Array.from(idsRelevantes) } },
      orderBy: { name: "asc" },
    });

    const resumos = await Promise.all(
      professoresRelevantes.map(async (professor) => {
        const resumo = await this.getResumoProfessor(professor.id, p);
        return {
          professorId: professor.id,
          nome: professor.name,
          ativo: professor.active,
          totalAulas: resumo.totalTurmas + resumo.totalPersonais,
          valorAulas: resumo.valorAulas,
          valorComoAuxiliar: resumo.valorComoAuxiliar,
          totalReceber: resumo.totalReceber,
        };
      }),
    );

    const resumosComMovimento = resumos.filter(
      (r) => r.totalAulas > 0 || r.valorComoAuxiliar > 0,
    );

    const totalGeralProfessor = resumosComMovimento.reduce(
      (s, r) => s + r.valorAulas,
      0,
    );
    const totalGeralAuxiliares = resumosComMovimento.reduce(
      (s, r) => s + r.valorComoAuxiliar,
      0,
    );

    return {
      periodo: p,
      professores: resumosComMovimento,
      totalGeralProfessor,
      totalGeralAuxiliares,
      totalGeral: totalGeralProfessor + totalGeralAuxiliares,
    };
  }
}
