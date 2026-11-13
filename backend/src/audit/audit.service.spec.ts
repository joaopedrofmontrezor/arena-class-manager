import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { AuditService } from "./audit.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuditService", () => {
  let service: AuditService;
  let prisma: any;

  const OWNER = "owner-1";
  const PROF = "prof-1";
  const AUX = "prof-2";

  const aula = {
    professorId: PROF,
    assistantId: null as string | null,
    date: new Date("2026-11-10T00:00:00.000Z"),
    time: "17:30",
    type: "TURMA",
    professorValue: "28",
    observation: null as string | null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(async () => [
          { id: OWNER, name: "João Pedro" },
          { id: PROF, name: "Ana Souza" },
          { id: AUX, name: "Bruno Lima" },
        ]),
      },
      auditLog: {
        create: jest.fn(async () => ({})),
        findMany: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  const gravado = () => prisma.auditLog.create.mock.calls[0][0].data;

  describe("aulas", () => {
    it("criada: autor, professor, quinzena e resumo", async () => {
      await service.aulaCriada(PROF, { ...aula, assistantId: AUX });

      expect(gravado()).toMatchObject({
        action: "AULA_CRIADA",
        actorId: PROF,
        actorName: "Ana Souza",
        professorId: PROF,
        professorName: "Ana Souza",
        summary:
          "Criou a aula de 10/11/2026 às 17:30 (Turma) de Ana Souza — R$ 28,00, aux.: Bruno Lima",
      });
      expect(gravado().periodStart).toEqual(new Date("2026-11-01T00:00:00.000Z"));
    });

    it("quinzena do dia 16 em diante", async () => {
      await service.aulaCriada(PROF, {
        ...aula,
        date: new Date("2026-11-20T00:00:00.000Z"),
      });
      expect(gravado().periodStart).toEqual(new Date("2026-11-16T00:00:00.000Z"));
    });

    it("editada: guarda o autor (Owner) e só o que mudou", async () => {
      await service.aulaEditada(OWNER, aula, {
        ...aula,
        time: "18:00",
        assistantId: AUX,
      });

      const g = gravado();
      expect(g.action).toBe("AULA_EDITADA");
      expect(g.actorName).toBe("João Pedro");
      expect(g.professorName).toBe("Ana Souza");
      expect(g.summary).toBe(
        "Editou a aula de 10/11/2026 às 17:30 (Turma) de Ana Souza",
      );
      expect(g.changes).toEqual([
        { campo: "Horário", de: "17:30", para: "18:00" },
        { campo: "Auxiliar", de: "sem auxiliar", para: "Bruno Lima" },
      ]);
    });

    it("editada sem nenhuma mudança real: não registra", async () => {
      await service.aulaEditada(PROF, aula, { ...aula });
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("excluída: descreve a aula que foi apagada", async () => {
      await service.aulaExcluida(PROF, aula);
      expect(gravado()).toMatchObject({
        action: "AULA_EXCLUIDA",
        summary:
          "Excluiu a aula de 10/11/2026 às 17:30 (Turma) de Ana Souza — R$ 28,00",
      });
    });
  });

  describe("fechamento", () => {
    const periodo = {
      periodStart: new Date("2026-10-16T00:00:00.000Z"),
      label: "16 a 31 de outubro",
    };

    it("período fechado e reaberto", async () => {
      await service.periodoFechado(OWNER, periodo);
      await service.periodoReaberto(OWNER, periodo);

      const [a, b] = prisma.auditLog.create.mock.calls.map((c: any) => c[0].data);
      expect(a).toMatchObject({
        action: "PERIODO_FECHADO",
        summary: "Fechou o período 16 a 31 de outubro",
        periodStart: periodo.periodStart,
        actorName: "João Pedro",
      });
      expect(b).toMatchObject({
        action: "PERIODO_REABERTO",
        summary: "Reabriu o período 16 a 31 de outubro",
      });
    });

    it("pagamento marcado e desfeito, com professor e valor", async () => {
      await service.pagamentoMarcado(OWNER, periodo, PROF, 118.5);
      await service.pagamentoDesfeito(OWNER, periodo, PROF, 118.5);

      const [a, b] = prisma.auditLog.create.mock.calls.map((c: any) => c[0].data);
      expect(a).toMatchObject({
        action: "PAGAMENTO_MARCADO",
        professorId: PROF,
        professorName: "Ana Souza",
        summary: "Marcou como pago Ana Souza: R$ 118,50 (16 a 31 de outubro)",
      });
      expect(b).toMatchObject({
        action: "PAGAMENTO_DESFEITO",
        summary: "Desfez o pagamento de Ana Souza: R$ 118,50 (16 a 31 de outubro)",
      });
    });
  });

  describe("falhas", () => {
    it("falha ao gravar o histórico NÃO derruba a ação do usuário", async () => {
      prisma.auditLog.create.mockRejectedValue(new Error("banco caiu"));
      await expect(service.aulaExcluida(PROF, aula)).resolves.toBeUndefined();
    });

    it("falha ao buscar nomes também não derruba", async () => {
      prisma.user.findMany.mockRejectedValue(new Error("banco caiu"));
      await expect(service.aulaCriada(PROF, aula)).resolves.toBeUndefined();
    });

    it("nome ausente vira texto neutro em vez de quebrar", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.aulaExcluida("fantasma", aula);
      expect(gravado().actorName).toBe("usuário removido");
      expect(gravado().professorName).toBe("professor removido");
    });
  });

  describe("listar", () => {
    const linhas = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `id-${i}` }));

    it("sem filtros: mais recentes primeiro, pede uma linha a mais para saber se há mais", async () => {
      prisma.auditLog.findMany.mockResolvedValue(linhas(3));

      const r = await service.listar({ limite: 3 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 4,
      });
      expect(r.itens).toHaveLength(3);
      expect(r.proximoCursor).toBeNull();
    });

    it("há mais páginas: devolve o limite e o cursor do último item", async () => {
      prisma.auditLog.findMany.mockResolvedValue(linhas(4));

      const r = await service.listar({ limite: 3 });

      expect(r.itens).toHaveLength(3);
      expect(r.proximoCursor).toBe("id-2");
    });

    it("filtros de quinzena e professor, e cursor pulando o próprio cursor", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      const periodStart = new Date("2026-11-01T00:00:00.000Z");

      await service.listar({
        periodStart,
        professorId: PROF,
        cursor: "id-9",
        limite: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { periodStart, professorId: PROF },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 11,
        cursor: { id: "id-9" },
        skip: 1,
      });
    });
  });
});
