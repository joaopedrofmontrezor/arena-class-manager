import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import * as bcrypt from "bcrypt";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function extractCookie(setCookieHeader: string[], name: string): string {
  const raw = setCookieHeader.find((c) => c.startsWith(`${name}=`));
  if (!raw) {
    throw new Error(`Cookie ${name} não encontrado na resposta.`);
  }
  return raw.split(";")[0].split("=").slice(1).join("=");
}

interface SessaoAutenticada {
  cookieHeader: string;
  csrfToken: string;
}

describe("Arena Class Manager - E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const OWNER_EMAIL = "owner.e2e@arena-test.com";
  const OWNER_SENHA = "senhaDoOwner123";

  const PROF_A_EMAIL = "professorA.e2e@arena-test.com";
  const PROF_B_EMAIL = "professorB.e2e@arena-test.com";
  const SENHA_PROFESSORES = "senhaDoProfessor123";

  const PROF_TEMP_EMAIL = "professorTemp.e2e@arena-test.com";

  // Pagamentos e fechamentos referenciam usuários com ON DELETE RESTRICT,
  // então precisam sair antes dos usuários de teste.
  async function limparFechamentosDeTeste() {
    await prisma.closingPayment.deleteMany({
      where: { closedPeriod: { closedBy: { email: OWNER_EMAIL } } },
    });
    await prisma.closedPeriod.deleteMany({
      where: { closedBy: { email: OWNER_EMAIL } },
    });
  }

  let profAId: string;
  let profBId: string;
  let lessonDoProfessorAId: string;

  let sessaoOwner: SessaoAutenticada;
  let sessaoProfA: SessaoAutenticada;
  let sessaoProfB: SessaoAutenticada;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);

    await limparFechamentosDeTeste();
    await prisma.lesson.deleteMany({
      where: {
        professor: { email: { in: [PROF_A_EMAIL, PROF_B_EMAIL] } },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [OWNER_EMAIL, PROF_A_EMAIL, PROF_B_EMAIL, PROF_TEMP_EMAIL],
        },
      },
    });

    await prisma.user.create({
      data: {
        name: "Owner E2E",
        email: OWNER_EMAIL,
        password: await bcrypt.hash(OWNER_SENHA, 10),
        role: "OWNER",
        active: true,
      },
    });

    const profA = await prisma.user.create({
      data: {
        name: "Professor A E2E",
        email: PROF_A_EMAIL,
        password: await bcrypt.hash(SENHA_PROFESSORES, 10),
        role: "PROFESSOR",
        active: true,
      },
    });
    profAId = profA.id;

    const profB = await prisma.user.create({
      data: {
        name: "Professor B E2E",
        email: PROF_B_EMAIL,
        password: await bcrypt.hash(SENHA_PROFESSORES, 10),
        role: "PROFESSOR",
        active: true,
      },
    });
    profBId = profB.id;

    const aula = await prisma.lesson.create({
      data: {
        date: new Date("2026-09-10"),
        time: "18:00",
        type: "TURMA",
        professorId: profAId,
        assistantId: profBId,
        professorValue: 28,
        assistantValue: 10.5,
      },
    });
    lessonDoProfessorAId = aula.id;

    // De propósito: maiúsculas e espaços nas pontas. Toda a suíte passa a
    // depender de o login ignorar a caixa do e-mail.
    sessaoOwner = await login(` ${OWNER_EMAIL.toUpperCase()} `, OWNER_SENHA);
    sessaoProfA = await login(PROF_A_EMAIL, SENHA_PROFESSORES);
    sessaoProfB = await login(PROF_B_EMAIL, SENHA_PROFESSORES);
  });

  afterAll(async () => {
    await limparFechamentosDeTeste();
    await prisma.lesson.deleteMany({
      where: {
        professor: { email: { in: [PROF_A_EMAIL, PROF_B_EMAIL] } },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [OWNER_EMAIL, PROF_A_EMAIL, PROF_B_EMAIL, PROF_TEMP_EMAIL],
        },
      },
    });
    await app.close();
  });

  async function login(
    email: string,
    senha: string,
  ): Promise<SessaoAutenticada> {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: senha })
      .expect(201);

    const setCookie = res.headers["set-cookie"] as unknown as string[];
    const token = extractCookie(setCookie, "token");
    const csrfToken = extractCookie(setCookie, CSRF_COOKIE_NAME);

    return {
      cookieHeader: `token=${token}; ${CSRF_COOKIE_NAME}=${csrfToken}`,
      csrfToken,
    };
  }

  describe("Autenticação", () => {
    it("recusa acesso a uma rota protegida sem nenhum token (401)", async () => {
      await request(app.getHttpServer()).get("/auth/me").expect(401);
    });

    it("recusa acesso com um JWT inválido/corrompido (401)", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", "token=isto-nao-e-um-jwt-valido")
        .expect(401);
    });

    it("recusa login com senha incorreta (401)", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: OWNER_EMAIL, password: "senha-errada" })
        .expect(401);
    });

    it("realiza login com sucesso e retorna os cookies de sessão e CSRF", async () => {
      expect(sessaoOwner.csrfToken.length).toBeGreaterThan(0);
    });
  });

  describe("E-mail sem diferenciar maiúsculas/minúsculas", () => {
    const NOVO_EMAIL = "Maiuscula.E2E@Arena-Test.com";
    const NOVO_EMAIL_NORMALIZADO = NOVO_EMAIL.toLowerCase();
    // Conta "antiga", gravada direto no banco com maiúsculas.
    const LEGADO_EMAIL = "Legado.E2E@Arena-Test.com";
    // Par de e-mails que só diferem no "_" (que vira curinga em ILIKE).
    const PARECIDO_EMAIL = "wildxe2e@arena-test.com";
    const COM_UNDERSCORE_EMAIL = "wild_e2e@arena-test.com";
    const SENHA = "senhaDoLegado123";

    const limpar = () =>
      prisma.user.deleteMany({
        where: {
          email: {
            in: [
              NOVO_EMAIL_NORMALIZADO,
              LEGADO_EMAIL,
              PARECIDO_EMAIL,
              COM_UNDERSCORE_EMAIL,
            ],
          },
        },
      });

    beforeAll(limpar);
    afterAll(limpar);

    const cadastrar = (email: string) =>
      request(app.getHttpServer())
        .post("/users")
        .set("Cookie", sessaoOwner.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoOwner.csrfToken)
        .send({
          name: "Teste E-mail",
          email,
          password: SENHA,
          role: "PROFESSOR",
        });

    it("o cadastro grava o e-mail em minúsculas e sem espaços (201)", async () => {
      const res = await cadastrar(` ${NOVO_EMAIL} `).expect(201);

      expect(res.body.email).toBe(NOVO_EMAIL_NORMALIZADO);
      const noBanco = await prisma.user.findFirst({
        where: { email: NOVO_EMAIL_NORMALIZADO },
      });
      expect(noBanco).not.toBeNull();
    });

    it("cadastrar o mesmo e-mail com outra caixa é conflito (409)", async () => {
      await cadastrar(NOVO_EMAIL.toUpperCase()).expect(409);
    });

    it("uma conta antiga gravada com maiúsculas continua entrando com o e-mail em minúsculas", async () => {
      await prisma.user.create({
        data: {
          name: "Conta Legada E2E",
          email: LEGADO_EMAIL,
          password: await bcrypt.hash(SENHA, 10),
          role: "PROFESSOR",
          active: true,
        },
      });

      // Atenção ao limite do login (5/min por IP): os logins do beforeAll (3),
      // o teste de senha incorreta (1) e este (1) usam o orçamento todo. Se
      // outro teste passar a chamar /auth/login, este grupo precisa ser revisto.
      await login(LEGADO_EMAIL.toLowerCase(), SENHA);
    });

    it("não deixa criar duplicata de uma conta antiga só trocando a caixa (409)", async () => {
      await cadastrar(LEGADO_EMAIL.toLowerCase()).expect(409);
    });

    it("'_' no e-mail é caractere comum, não curinga: não acusa duplicata de um e-mail parecido", async () => {
      // Se a busca fosse ILIKE, "wild_e2e@..." casaria com "wildxe2e@..." e o
      // cadastro viria 409 sem motivo.
      await prisma.user.create({
        data: {
          name: "Parecido E2E",
          email: PARECIDO_EMAIL,
          password: await bcrypt.hash(SENHA, 10),
          role: "PROFESSOR",
          active: true,
        },
      });

      await cadastrar(COM_UNDERSCORE_EMAIL).expect(201);
    });

    it("e o mesmo e-mail com '_' repetido, aí sim, é duplicata (409)", async () => {
      await cadastrar(COM_UNDERSCORE_EMAIL.toUpperCase()).expect(409);
    });
  });

  describe("CSRF", () => {
    it("recusa uma requisição de escrita autenticada mas sem o header x-csrf-token (403)", async () => {
      await request(app.getHttpServer())
        .post("/lessons")
        .set("Cookie", sessaoProfA.cookieHeader)
        .send({
          date: "2026-09-11",
          time: "19:00",
          type: "TURMA",
          assistantId: profBId,
        })
        .expect(403);
    });
  });

  describe("Autorização por papel (RBAC)", () => {
    it("recusa um PROFESSOR tentando acessar uma rota exclusiva de OWNER (403)", async () => {
      await request(app.getHttpServer())
        .get("/closing/general")
        .set("Cookie", sessaoProfA.cookieHeader)
        .expect(403);
    });

    it("permite que o OWNER acesse o fechamento geral", async () => {
      await request(app.getHttpServer())
        .get("/closing/general")
        .set("Cookie", sessaoOwner.cookieHeader)
        .expect(200);
    });
  });

  describe("Regra de negócio: edição entre professores diferentes", () => {
    it("recusa o Professor B tentando editar uma aula que pertence ao Professor A (403)", async () => {
      await request(app.getHttpServer())
        .patch(`/lessons/${lessonDoProfessorAId}`)
        .set("Cookie", sessaoProfB.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoProfB.csrfToken)
        .send({ observation: "tentando editar aula de outro professor" })
        .expect(403);
    });

    it("permite que o próprio Professor A edite sua aula", async () => {
      await request(app.getHttpServer())
        .patch(`/lessons/${lessonDoProfessorAId}`)
        .set("Cookie", sessaoProfA.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoProfA.csrfToken)
        .send({ observation: "editado pelo dono da aula" })
        .expect(200);
    });

    it("permite que o OWNER edite a aula de qualquer professor (override administrativo)", async () => {
      await request(app.getHttpServer())
        .patch(`/lessons/${lessonDoProfessorAId}`)
        .set("Cookie", sessaoOwner.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoOwner.csrfToken)
        .send({ observation: "editado pelo owner" })
        .expect(200);
    });
  });

  describe("Validação de payload", () => {
    it("rejeita um horário em formato inválido (400)", async () => {
      await request(app.getHttpServer())
        .post("/lessons")
        .set("Cookie", sessaoProfA.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoProfA.csrfToken)
        .send({
          date: "2026-09-12",
          time: "99:99",
          type: "TURMA",
          assistantId: profBId,
        })
        .expect(400);
    });

    it("rejeita campos não whitelistados, como tentar enviar professorValue numa aula TURMA junto de um campo extra desconhecido", async () => {
      await request(app.getHttpServer())
        .post("/lessons")
        .set("Cookie", sessaoProfA.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoProfA.csrfToken)
        .send({
          date: "2026-09-12",
          time: "18:00",
          type: "TURMA",
          assistantId: profBId,
          campoInventado: "não deveria existir",
        })
        .expect(400);
    });
  });

  describe("Sessão de usuário desativado ou removido", () => {
    async function criarProfessorTemporarioComToken() {
      const user = await prisma.user.create({
        data: {
          name: "Professor Temporário E2E",
          email: PROF_TEMP_EMAIL,
          password: await bcrypt.hash(SENHA_PROFESSORES, 10),
          role: "PROFESSOR",
          active: true,
        },
      });
      const token = app
        .get(JwtService, { strict: false })
        .sign({ sub: user.id, role: user.role, name: user.name });
      return { user, cookie: `token=${token}` };
    }

    afterEach(async () => {
      await prisma.user.deleteMany({ where: { email: PROF_TEMP_EMAIL } });
    });

    it("bloqueia (401) um token ainda válido assim que o Owner desativa o professor", async () => {
      const { user, cookie } = await criarProfessorTemporarioComToken();

      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", cookie)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .set("Cookie", sessaoOwner.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoOwner.csrfToken)
        .send({ active: false })
        .expect(200);

      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", cookie)
        .expect(401);
    });

    it("volta a aceitar o mesmo token se o Owner reativar o professor", async () => {
      const { user, cookie } = await criarProfessorTemporarioComToken();

      await prisma.user.update({
        where: { id: user.id },
        data: { active: false },
      });
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", cookie)
        .expect(401);

      await prisma.user.update({
        where: { id: user.id },
        data: { active: true },
      });
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", cookie)
        .expect(200);
    });

    it("bloqueia (401) o token de um usuário que foi removido do banco", async () => {
      const { user, cookie } = await criarProfessorTemporarioComToken();

      await prisma.user.delete({ where: { id: user.id } });

      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", cookie)
        .expect(401);
    });
  });

  describe("Fechamento de período (trava de edição e pagamento)", () => {
    const INICIO = "2026-08-01";
    const FIM = "2026-08-15";
    const DIA_DENTRO = "2026-08-05";
    const OUTRO_DIA_DENTRO = "2026-08-10";
    const DIA_PERIODO_VIZINHO = "2026-08-16";

    let aulaNoPeriodoId: string;
    let periodoFechadoId: string;

    const comoOwner = (t: request.Test) =>
      t
        .set("Cookie", sessaoOwner.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoOwner.csrfToken);
    const comoProfA = (t: request.Test) =>
      t
        .set("Cookie", sessaoProfA.cookieHeader)
        .set(CSRF_HEADER_NAME, sessaoProfA.csrfToken);

    const queryPeriodo = `start=${INICIO}&end=${FIM}`;

    it("o professor consegue lançar uma aula enquanto o período está aberto (201)", async () => {
      const res = await comoProfA(request(app.getHttpServer()).post("/lessons"))
        .send({ date: DIA_DENTRO, time: "09:00", type: "TURMA" })
        .expect(201);
      aulaNoPeriodoId = res.body.id;
    });

    it("um PROFESSOR não pode fechar período (403)", async () => {
      await comoProfA(request(app.getHttpServer()).post("/closing/periods"))
        .send({ start: INICIO })
        .expect(403);
    });

    it("recusa um início que não seja dia 1 ou 16 (400)", async () => {
      await comoOwner(request(app.getHttpServer()).post("/closing/periods"))
        .send({ start: "2026-08-05" })
        .expect(400);
    });

    it("recusa fechar um período que ainda não terminou (400)", async () => {
      await comoOwner(request(app.getHttpServer()).post("/closing/periods"))
        .send({ start: "2099-01-01" })
        .expect(400);
    });

    it("o OWNER fecha o período (201)", async () => {
      const res = await comoOwner(
        request(app.getHttpServer()).post("/closing/periods"),
      )
        .send({ start: INICIO })
        .expect(201);
      periodoFechadoId = res.body.id;
      expect(res.body.label).toBe("01 a 15 de agosto");
    });

    it("fechar o mesmo período de novo dá conflito (409)", async () => {
      await comoOwner(request(app.getHttpServer()).post("/closing/periods"))
        .send({ start: INICIO })
        .expect(409);
    });

    it("bloqueia (409) criar uma aula dentro do período fechado", async () => {
      await comoProfA(request(app.getHttpServer()).post("/lessons"))
        .send({ date: OUTRO_DIA_DENTRO, time: "10:00", type: "TURMA" })
        .expect(409);
    });

    it("bloqueia (409) criar aulas em lote dentro do período fechado", async () => {
      await comoProfA(request(app.getHttpServer()).post("/lessons/batch"))
        .send({
          date: OUTRO_DIA_DENTRO,
          lessons: [{ time: "10:00", type: "TURMA" }],
        })
        .expect(409);
    });

    it("bloqueia (409) editar uma aula do período fechado, para o professor e para o OWNER", async () => {
      await comoProfA(
        request(app.getHttpServer()).patch(`/lessons/${aulaNoPeriodoId}`),
      )
        .send({ observation: "mudando depois de fechado" })
        .expect(409);

      await comoOwner(
        request(app.getHttpServer()).patch(`/lessons/${aulaNoPeriodoId}`),
      )
        .send({ observation: "owner também não pode" })
        .expect(409);
    });

    it("bloqueia (409) excluir uma aula do período fechado", async () => {
      await comoProfA(
        request(app.getHttpServer()).delete(`/lessons/${aulaNoPeriodoId}`),
      ).expect(409);
    });

    it("bloqueia (409) mover uma aula de um período aberto para dentro do fechado", async () => {
      await comoProfA(
        request(app.getHttpServer()).patch(`/lessons/${lessonDoProfessorAId}`),
      )
        .send({ date: DIA_DENTRO })
        .expect(409);
    });

    it("o período vizinho continua aberto (a trava vale só para a quinzena fechada)", async () => {
      await comoProfA(request(app.getHttpServer()).post("/lessons"))
        .send({ date: DIA_PERIODO_VIZINHO, time: "09:00", type: "TURMA" })
        .expect(201);
    });

    it("o fechamento geral mostra o período como fechado e ninguém pago ainda", async () => {
      const res = await request(app.getHttpServer())
        .get(`/closing/general?${queryPeriodo}`)
        .set("Cookie", sessaoOwner.cookieHeader)
        .expect(200);

      expect(res.body.fechamento.id).toBe(periodoFechadoId);
      const linhaA = res.body.professores.find(
        (p: { professorId: string }) => p.professorId === profAId,
      );
      expect(linhaA.pago).toBe(false);
      expect(linhaA.totalReceber).toBe(28);
    });

    it("o professor vê no próprio fechamento que o período está fechado e não pago", async () => {
      const res = await request(app.getHttpServer())
        .get(`/closing/me?${queryPeriodo}`)
        .set("Cookie", sessaoProfA.cookieHeader)
        .expect(200);

      expect(res.body.fechamento.id).toBe(periodoFechadoId);
      expect(res.body.fechamento.pago).toBe(false);
    });

    it("um PROFESSOR não pode marcar pagamento (403)", async () => {
      await comoProfA(
        request(app.getHttpServer()).post(
          `/closing/periods/${periodoFechadoId}/payments/${profAId}`,
        ),
      ).expect(403);
    });

    it("recusa marcar como pago um professor sem valor a receber no período (400)", async () => {
      await comoOwner(
        request(app.getHttpServer()).post(
          `/closing/periods/${periodoFechadoId}/payments/${profBId}`,
        ),
      ).expect(400);
    });

    it("o OWNER marca o professor como pago e o valor fica registrado (201)", async () => {
      const res = await comoOwner(
        request(app.getHttpServer()).post(
          `/closing/periods/${periodoFechadoId}/payments/${profAId}`,
        ),
      ).expect(201);

      expect(Number(res.body.amount)).toBe(28);
    });

    it("marcar o mesmo professor como pago de novo dá conflito (409)", async () => {
      await comoOwner(
        request(app.getHttpServer()).post(
          `/closing/periods/${periodoFechadoId}/payments/${profAId}`,
        ),
      ).expect(409);
    });

    it("geral e fechamento do professor passam a mostrar o pagamento", async () => {
      const geral = await request(app.getHttpServer())
        .get(`/closing/general?${queryPeriodo}`)
        .set("Cookie", sessaoOwner.cookieHeader)
        .expect(200);
      const linhaA = geral.body.professores.find(
        (p: { professorId: string }) => p.professorId === profAId,
      );
      expect(linhaA.pago).toBe(true);
      expect(linhaA.valorPago).toBe(28);

      const meu = await request(app.getHttpServer())
        .get(`/closing/me?${queryPeriodo}`)
        .set("Cookie", sessaoProfA.cookieHeader)
        .expect(200);
      expect(meu.body.fechamento.pago).toBe(true);
    });

    it("não deixa reabrir o período enquanto houver pagamento (409)", async () => {
      await comoOwner(
        request(app.getHttpServer()).delete(
          `/closing/periods/${periodoFechadoId}`,
        ),
      ).expect(409);
    });

    it("desfazer o pagamento e depois reabrir o período funciona (200)", async () => {
      await comoOwner(
        request(app.getHttpServer()).delete(
          `/closing/periods/${periodoFechadoId}/payments/${profAId}`,
        ),
      ).expect(200);

      await comoOwner(
        request(app.getHttpServer()).delete(
          `/closing/periods/${periodoFechadoId}`,
        ),
      ).expect(200);
    });

    it("depois de reaberto, o professor volta a poder editar a aula (200) e o status some", async () => {
      await comoProfA(
        request(app.getHttpServer()).patch(`/lessons/${aulaNoPeriodoId}`),
      )
        .send({ observation: "editado depois de reabrir" })
        .expect(200);

      const geral = await request(app.getHttpServer())
        .get(`/closing/general?${queryPeriodo}`)
        .set("Cookie", sessaoOwner.cookieHeader)
        .expect(200);
      expect(geral.body.fechamento).toBeNull();
    });
  });

  describe("Rate limiting no login (proteção contra brute-force)", () => {
    it("retorna 429 após exceder o limite de tentativas de login (5/min)", async () => {
      const LIMITE = 5;
      for (let i = 0; i < LIMITE; i++) {
        await request(app.getHttpServer())
          .post("/auth/login")
          .send({ email: OWNER_EMAIL, password: "senha-errada" });
      }

      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: OWNER_EMAIL, password: "senha-errada" })
        .expect(429);
    }, 15_000);
  });
});
