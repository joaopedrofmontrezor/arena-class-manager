import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ClosingService } from "./closing.service";
import { AuditService } from "../audit/audit.service";
import { getPeriodoAtual, Periodo, periodoJaEncerrado } from "./period.util";

interface PagamentoRegistro {
  professorId: string;
  paidAt: Date;
  amount: unknown;
}

export interface StatusPagamento {
  pago: boolean;
  pagoEm: Date | null;
  valorPago: number | null;
}

function codigoPrisma(erro: unknown): string | undefined {
  return typeof erro === "object" && erro !== null && "code" in erro
    ? String((erro as { code: unknown }).code)
    : undefined;
}

function fimDoDia(dataSomenteDia: Date): Date {
  return new Date(
    Date.UTC(
      dataSomenteDia.getUTCFullYear(),
      dataSomenteDia.getUTCMonth(),
      dataSomenteDia.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

@Injectable()
export class ClosingPeriodsService {
  constructor(
    private prisma: PrismaService,
    private closing: ClosingService,
    private audit: AuditService,
  ) {}

  
  private periodoCanonico(start: string): Periodo {
    const data = new Date(start);
    const dia = data.getUTCDate();
    if (dia !== 1 && dia !== 16) {
      throw new BadRequestException(
        "O período deve começar no dia 1 ou no dia 16 do mês.",
      );
    }
    return getPeriodoAtual(data);
  }

  
  async assertDateOpen(date: Date): Promise<void> {
    const fechado = await this.prisma.closedPeriod.findFirst({
      where: { periodStart: { lte: date }, periodEnd: { gte: date } },
      select: { label: true },
    });
    if (fechado) {
      throw new ConflictException(
        `O período de ${fechado.label} está fechado. Peça ao responsável para reabri-lo antes de alterar aulas dele.`,
      );
    }
  }

  async close(ownerId: string, start: string) {
    const periodo = this.periodoCanonico(start);

    if (!periodoJaEncerrado(periodo)) {
      throw new BadRequestException(
        "Só é possível fechar um período depois que ele terminar.",
      );
    }

    const existente = await this.prisma.closedPeriod.findUnique({
      where: { periodStart: periodo.start },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException("Este período já está fechado.");
    }

    let criado;
    try {
      criado = await this.prisma.closedPeriod.create({
        data: {
          periodStart: periodo.start,
          periodEnd: periodo.end,
          label: periodo.label,
          closedById: ownerId,
        },
      });
    } catch (erro) {
      if (codigoPrisma(erro) === "P2002") {
        throw new ConflictException("Este período já está fechado.");
      }
      throw erro;
    }
    await this.audit.periodoFechado(ownerId, criado);
    return criado;
  }

  async reopen(closedPeriodId: string, ownerId: string) {
    const periodo = await this.prisma.closedPeriod.findUnique({
      where: { id: closedPeriodId },
      include: { _count: { select: { payments: true } } },
    });
    if (!periodo) throw new NotFoundException("Período fechado não encontrado.");

    if (periodo._count.payments > 0) {
      throw new ConflictException(
        "Há pagamentos registrados neste período. Desfaça-os antes de reabrir.",
      );
    }

    try {
      await this.prisma.closedPeriod.delete({ where: { id: closedPeriodId } });
    } catch (erro) {
      
      if (codigoPrisma(erro) === "P2003") {
        throw new ConflictException(
          "Há pagamentos registrados neste período. Desfaça-os antes de reabrir.",
        );
      }
      throw erro;
    }
    await this.audit.periodoReaberto(ownerId, periodo);
    return { ok: true };
  }

  async markPaid(ownerId: string, closedPeriodId: string, professorId: string) {
    const periodo = await this.prisma.closedPeriod.findUnique({
      where: { id: closedPeriodId },
    });
    if (!periodo) throw new NotFoundException("Período fechado não encontrado.");

    const professor = await this.prisma.user.findUnique({
      where: { id: professorId },
      select: { id: true },
    });
    if (!professor) throw new NotFoundException("Professor não encontrado.");

    
    const resumo = await this.closing.getResumoProfessor(professorId, {
      start: periodo.periodStart,
      end: fimDoDia(periodo.periodEnd),
      label: periodo.label,
    });
    if (resumo.totalReceber <= 0) {
      throw new BadRequestException(
        "Este professor não tem valor a receber neste período.",
      );
    }

    let pagamento;
    try {
      pagamento = await this.prisma.closingPayment.create({
        data: {
          closedPeriodId,
          professorId,
          amount: resumo.totalReceber,
          paidById: ownerId,
        },
      });
    } catch (erro) {
      if (codigoPrisma(erro) === "P2002") {
        throw new ConflictException(
          "Este professor já está marcado como pago neste período.",
        );
      }
      throw erro;
    }
    await this.audit.pagamentoMarcado(
      ownerId,
      periodo,
      professorId,
      resumo.totalReceber,
    );
    return pagamento;
  }

  async unmarkPaid(
    closedPeriodId: string,
    professorId: string,
    ownerId: string,
  ) {
    // Lê antes de apagar para o histórico saber o valor e o período.
    const anterior = await this.prisma.closingPayment.findUnique({
      where: { closedPeriodId_professorId: { closedPeriodId, professorId } },
      include: { closedPeriod: { select: { periodStart: true, label: true } } },
    });
    const { count } = await this.prisma.closingPayment.deleteMany({
      where: { closedPeriodId, professorId },
    });
    if (count === 0) {
      throw new NotFoundException("Pagamento não encontrado.");
    }
    if (anterior) {
      await this.audit.pagamentoDesfeito(
        ownerId,
        anterior.closedPeriod,
        professorId,
        Number(anterior.amount),
      );
    }
    return { ok: true };
  }

  
  async withStatusGeral<
    T extends {
      periodo: { start: Date };
      professores: { professorId: string }[];
    },
  >(
    resumo: T,
  ): Promise<
    Omit<T, "professores"> & {
      fechamento: { id: string; fechadoEm: Date } | null;
      professores: Array<T["professores"][number] & StatusPagamento>;
    }
  > {
    const fechamento = await this.prisma.closedPeriod.findUnique({
      where: { periodStart: resumo.periodo.start },
      include: { payments: true },
    });

    const pagamentos = new Map<string, PagamentoRegistro>(
      ((fechamento?.payments ?? []) as PagamentoRegistro[]).map((p) => [
        p.professorId,
        p,
      ]),
    );

    const professores = resumo.professores.map((prof) => {
      const pagamento = pagamentos.get(prof.professorId);
      return {
        ...prof,
        pago: Boolean(pagamento),
        pagoEm: pagamento?.paidAt ?? null,
        valorPago: pagamento ? Number(pagamento.amount) : null,
      };
    }) as Array<T["professores"][number] & StatusPagamento>;

    return {
      ...resumo,
      fechamento: fechamento
        ? { id: fechamento.id, fechadoEm: fechamento.closedAt }
        : null,
      professores,
    };
  }

  
  async withStatusProfessor<T extends { periodo: { start: Date } }>(
    resumo: T,
    professorId: string,
  ) {
    const fechamento = await this.prisma.closedPeriod.findUnique({
      where: { periodStart: resumo.periodo.start },
      include: { payments: { where: { professorId } } },
    });

    if (!fechamento) return { ...resumo, fechamento: null };

    const pagamento: PagamentoRegistro | undefined = fechamento.payments[0];
    return {
      ...resumo,
      fechamento: {
        id: fechamento.id,
        fechadoEm: fechamento.closedAt,
        pago: Boolean(pagamento),
        pagoEm: pagamento?.paidAt ?? null,
        valorPago: pagamento ? Number(pagamento.amount) : null,
      },
    };
  }
}
