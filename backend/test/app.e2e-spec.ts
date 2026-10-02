import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import * as bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

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

    await prisma.lesson.deleteMany({
      where: {
        professor: { email: { in: [PROF_A_EMAIL, PROF_B_EMAIL] } },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [OWNER_EMAIL, PROF_A_EMAIL, PROF_B_EMAIL] } },
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

    sessaoOwner = await login(OWNER_EMAIL, OWNER_SENHA);
    sessaoProfA = await login(PROF_A_EMAIL, SENHA_PROFESSORES);
    sessaoProfB = await login(PROF_B_EMAIL, SENHA_PROFESSORES);
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({
      where: {
        professor: { email: { in: [PROF_A_EMAIL, PROF_B_EMAIL] } },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [OWNER_EMAIL, PROF_A_EMAIL, PROF_B_EMAIL] } },
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
