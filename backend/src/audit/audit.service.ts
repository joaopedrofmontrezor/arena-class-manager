import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { formatarMoeda } from "../closing/closing-export.formatter";
import { getPeriodoAtual } from "../closing/period.util";
import {
  AlteracaoCampo,
  AulaSnapshot,
  diffAula,
  formatarData,
  rotuloTipo,
  SEM_AUXILIAR,
} from "./audit.format";

export type AcaoAuditoria =
  | "AULA_CRIADA"
  | "AULA_EDITADA"
  | "AULA_EXCLUIDA"
  | "PERIODO_FECHADO"
  | "PERIODO_REABERTO"
  | "PAGAMENTO_MARCADO"
  | "PAGAMENTO_DESFEITO";

interface AulaRegistro extends AulaSnapshot {
  professorId: string;
}

interface PeriodoRegistro {
  periodStart: Date;
  label: string;
}

interface NovoRegistro {
  action: AcaoAuditoria;
  actorId: string;
  actorName: string;
  professorId?: string | null;
  professorName?: string | null;
  periodStart?: Date | null;
  summary: string;
  changes?: AlteracaoCampo[] | null;
}

export interface FiltroAuditoria {
  periodStart?: Date;
  professorId?: string;
  cursor?: string;
  limite: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  // O histórico é um registro de apoio: se falhar, a ação do usuário (que já
  // foi concluída) não deve ser desfeita nem dar erro. A falha vai para o log.
  private async seguro(acao: AcaoAuditoria, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (erro) {
      this.logger.error(
        `Falha ao registrar histórico (${acao}): ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
    }
  }

  private async nomes(
    ids: Array<string | null | undefined>,
  ): Promise<Map<string, string>> {
    const unicos = Array.from(
      new Set(ids.filter((id): id is string => !!id)),
    );
    if (unicos.length === 0) return new Map();
    const usuarios: Array<{ id: string; name: string }> =
      await this.prisma.user.findMany({
        where: { id: { in: unicos } },
        select: { id: true, name: true },
      });
    return new Map(usuarios.map((u) => [u.id, u.name]));
  }

  private gravar(registro: NovoRegistro) {
    return this.prisma.auditLog.create({
      data: {
        action: registro.action,
        actorId: registro.actorId,
        actorName: registro.actorName,
        professorId: registro.professorId ?? null,
        professorName: registro.professorName ?? null,
        periodStart: registro.periodStart ?? null,
        summary: registro.summary,
        changes: registro.changes ?? undefined,
      },
    });
  }

  private descricaoAula(aula: AulaRegistro, nomeProfessor: string): string {
    return `aula de ${formatarData(aula.date)} às ${aula.time} (${rotuloTipo(
      aula.type,
    )}) de ${nomeProfessor}`;
  }

  aulaCriada(atorId: string, aula: AulaRegistro) {
    return this.seguro("AULA_CRIADA", async () => {
      const nomes = await this.nomes([
        atorId,
        aula.professorId,
        aula.assistantId,
      ]);
      const professor = nomes.get(aula.professorId) ?? "professor removido";
      const extra = [
        formatarMoeda(Number(aula.professorValue)),
        aula.assistantId
          ? `aux.: ${nomes.get(aula.assistantId) ?? "removido"}`
          : null,
      ]
        .filter(Boolean)
        .join(", ");
      await this.gravar({
        action: "AULA_CRIADA",
        actorId: atorId,
        actorName: nomes.get(atorId) ?? "usuário removido",
        professorId: aula.professorId,
        professorName: professor,
        periodStart: getPeriodoAtual(aula.date).start,
        summary: `Criou a ${this.descricaoAula(aula, professor)} — ${extra}`,
      });
    });
  }

  aulaEditada(atorId: string, antes: AulaRegistro, depois: AulaRegistro) {
    return this.seguro("AULA_EDITADA", async () => {
      const nomes = await this.nomes([
        atorId,
        antes.professorId,
        antes.assistantId,
        depois.assistantId,
      ]);
      const nomeAuxiliar = (id: string | null) =>
        id ? (nomes.get(id) ?? "removido") : SEM_AUXILIAR;
      const mudancas = diffAula(antes, depois, nomeAuxiliar);
      if (mudancas.length === 0) return;

      const professor = nomes.get(antes.professorId) ?? "professor removido";
      await this.gravar({
        action: "AULA_EDITADA",
        actorId: atorId,
        actorName: nomes.get(atorId) ?? "usuário removido",
        professorId: antes.professorId,
        professorName: professor,
        // Quinzena em que a aula estava antes da edição. Se a data mudou
        // para outra quinzena, isso aparece em "Data" nas alterações.
        periodStart: getPeriodoAtual(antes.date).start,
        summary: `Editou a ${this.descricaoAula(antes, professor)}`,
        changes: mudancas,
      });
    });
  }

  aulaExcluida(atorId: string, aula: AulaRegistro) {
    return this.seguro("AULA_EXCLUIDA", async () => {
      const nomes = await this.nomes([
        atorId,
        aula.professorId,
        aula.assistantId,
      ]);
      const professor = nomes.get(aula.professorId) ?? "professor removido";
      const extra = [
        formatarMoeda(Number(aula.professorValue)),
        aula.assistantId
          ? `aux.: ${nomes.get(aula.assistantId) ?? "removido"}`
          : null,
      ]
        .filter(Boolean)
        .join(", ");
      await this.gravar({
        action: "AULA_EXCLUIDA",
        actorId: atorId,
        actorName: nomes.get(atorId) ?? "usuário removido",
        professorId: aula.professorId,
        professorName: professor,
        periodStart: getPeriodoAtual(aula.date).start,
        summary: `Excluiu a ${this.descricaoAula(aula, professor)} — ${extra}`,
      });
    });
  }

  periodoFechado(atorId: string, periodo: PeriodoRegistro) {
    return this.seguro("PERIODO_FECHADO", async () => {
      const nomes = await this.nomes([atorId]);
      await this.gravar({
        action: "PERIODO_FECHADO",
        actorId: atorId,
        actorName: nomes.get(atorId) ?? "usuário removido",
        periodStart: periodo.periodStart,
        summary: `Fechou o período ${periodo.label}`,
      });
    });
  }

  periodoReaberto(atorId: string, periodo: PeriodoRegistro) {
    return this.seguro("PERIODO_REABERTO", async () => {
      const nomes = await this.nomes([atorId]);
      await this.gravar({
        action: "PERIODO_REABERTO",
        actorId: atorId,
        actorName: nomes.get(atorId) ?? "usuário removido",
        periodStart: periodo.periodStart,
        summary: `Reabriu o período ${periodo.label}`,
      });
    });
  }

  pagamentoMarcado(
    atorId: string,
    periodo: PeriodoRegistro,
    professorId: string,
    valor: number,
  ) {
    return this.pagamento("PAGAMENTO_MARCADO", "Marcou como pago", atorId, periodo, professorId, valor);
  }

  pagamentoDesfeito(
    atorId: string,
    periodo: PeriodoRegistro,
    professorId: string,
    valor: number,
  ) {
    return this.pagamento("PAGAMENTO_DESFEITO", "Desfez o pagamento de", atorId, periodo, professorId, valor);
  }

  private pagamento(
    action: AcaoAuditoria,
    verbo: string,
    atorId: string,
    periodo: PeriodoRegistro,
    professorId: string,
    valor: number,
  ) {
    return this.seguro(action, async () => {
      const nomes = await this.nomes([atorId, professorId]);
      const professor = nomes.get(professorId) ?? "professor removido";
      await this.gravar({
        action,
        actorId: atorId,
        actorName: nomes.get(atorId) ?? "usuário removido",
        professorId,
        professorName: professor,
        periodStart: periodo.periodStart,
        summary: `${verbo} ${professor}: ${formatarMoeda(valor)} (${periodo.label})`,
      });
    });
  }

  async listar(filtro: FiltroAuditoria) {
    const where: Record<string, unknown> = {};
    if (filtro.periodStart) where.periodStart = filtro.periodStart;
    if (filtro.professorId) where.professorId = filtro.professorId;

    const linhas = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filtro.limite + 1,
      ...(filtro.cursor ? { cursor: { id: filtro.cursor }, skip: 1 } : {}),
    });

    const temMais = linhas.length > filtro.limite;
    const itens = temMais ? linhas.slice(0, filtro.limite) : linhas;
    return {
      itens,
      proximoCursor: temMais ? itens[itens.length - 1].id : null,
    };
  }
}
