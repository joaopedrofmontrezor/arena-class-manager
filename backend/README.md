# Arena Futevolei - Backend

API NestJS + Prisma + PostgreSQL para o sistema de controle de aulas e fechamentos.

## Setup

```bash
npm install
cp .env.example .env
# edite o .env com sua DATABASE_URL e um JWT_SECRET forte

npx prisma migrate dev --name init
npx prisma db seed

npm run start:dev
```

A API sobe em `http://localhost:3000` por padrao.

## Usuarios criados pelo seed

Todos com senha `123456`:

- `owner@arena.com` (OWNER)
- `joao@arena.com`, `carlos@arena.com`, `pedro@arena.com`, `lucas@arena.com`, `marcos@arena.com`, `rafael@arena.com` (PROFESSOR)

**Troque essas senhas antes de usar em producao.**

## Rotas principais

| Metodo | Rota              | Quem pode        | Descricao                                  |
|--------|-------------------|-------------------|---------------------------------------------|
| POST   | /auth/login        | Publico           | Login, retorna JWT                           |
| GET    | /users?role=PROFESSOR | Autenticado    | Lista professores (para o seletor de auxiliar) |
| POST   | /users              | OWNER            | Cria um novo professor/owner                  |
| POST   | /lessons            | Autenticado       | Cria uma aula (professor = usuario logado)    |
| GET    | /lessons            | Autenticado       | Lista aulas do periodo atual (ou start/end)   |
| PATCH  | /lessons/:id        | Dono da aula/OWNER| Edita uma aula                                |
| DELETE | /lessons/:id        | Dono da aula/OWNER| Exclui uma aula                               |
| GET    | /closing/me         | Autenticado       | Fechamento do professor logado                |
| GET    | /closing/general    | OWNER            | Fechamento geral de todos os professores      |

## Testes

```bash
npm run test
```

Cobre principalmente `src/closing/period.util.spec.ts`, que valida a regra de
calculo do periodo de fechamento (01-15 / 16-fim do mes) em casos de borda
como meses de 28, 29, 30 e 31 dias.

## Nota sobre o Prisma Client

Este ambiente de geracao nao tinha acesso a `binaries.prisma.sh`, entao o
`prisma generate` nao pode ser validado aqui. Rode `npx prisma generate`
(ele roda automaticamente apos `npm install` via `postinstall` em projetos
Nest padrao, mas aqui garanta rodando manualmente uma vez) na sua maquina
antes do primeiro `npm run start:dev`.
