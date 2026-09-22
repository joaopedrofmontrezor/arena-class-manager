# Arena Futevolei - Backend

API NestJS + Prisma + PostgreSQL para o sistema de controle de aulas e fechamentos.

## Setup

```bash
npm install
cp .env.example .env


npx prisma generate
npx prisma migrate dev --name business-rules-and-timezone-fixes
npx prisma db seed

npm run start:dev
```

A API sobe em `http://localhost:3000` por padrao.

> Se você já tinha o projeto rodando antes desta versão: o campo `date`
> da tabela `Lesson` mudou de `DateTime` para `DATE` puro (correção de
> timezone). Isso exige uma nova migration — o Prisma gera e aplica
> automaticamente ao rodar `npx prisma migrate dev`.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Connection string (pooled) do Postgres |
| `DIRECT_URL` | sim | Connection string direta (usada só pelas migrations) |
| `JWT_SECRET` | sim | Segredo forte, mínimo 16 caracteres. **A aplicação não sobe sem isso.** |
| `PORT` | não | Porta da API (padrão 3000) |
| `NODE_ENV` | não | `production` habilita cookie `secure` (exige HTTPS) |
| `FRONTEND_URL` | recomendado | URL do frontend, restringe o CORS. Sem ela, CORS fica aberto (com aviso no log) |

## Usuarios criados pelo seed de desenvolvimento

Todos com senha `123456`:

- `owner@arena.com` (OWNER)
- `joao@arena.com`, `carlos@arena.com`, `pedro@arena.com`, `lucas@arena.com`, `marcos@arena.com`, `rafael@arena.com` (PROFESSOR)

**Nunca rode `prisma db seed` (o de desenvolvimento) em produção.** Para
produção, use `npx ts-node prisma/seed-prod.ts`, que pergunta
interativamente o nome/e-mail/senha do OWNER real e não cria nenhum
professor fictício.

## Autenticação

O login (`POST /auth/login`) seta um **cookie httpOnly** com o token —
não fica acessível via `document.cookie`/JavaScript, reduzindo o risco
de um XSS roubar a sessão. O frontend precisa chamar a API com
`withCredentials: true` (já configurado) e o CORS precisa de
`credentials: true` (já configurado, restrito por `FRONTEND_URL`).

- `POST /auth/login` — autentica, seta o cookie, retorna `{ user }`
- `GET /auth/me` — retorna o usuário da sessão atual (usado pelo frontend para saber se já está logado)
- `POST /auth/logout` — limpa o cookie

Para uso via Postman/Insomnia/scripts (sem cookie de navegador), o
header `Authorization: Bearer <token>` continua funcionando como
fallback.

## Rotas principais

| Metodo | Rota                            | Quem pode              | Descricao                                        |
|--------|----------------------------------|--------------------------|-----------------------------------------------------|
| POST   | /auth/login                      | Publico (rate limited)   | Login, seta cookie httpOnly                          |
| GET    | /auth/me                         | Autenticado               | Dados da sessao atual                                |
| POST   | /auth/logout                      | Autenticado               | Encerra a sessao                                     |
| GET    | /users?role=PROFESSOR             | Autenticado               | Lista professores ativos (seletor de auxiliar)       |
| GET    | /users?role=PROFESSOR&all=true     | OWNER                     | Lista todos, inclusive inativos (tela de gestao)     |
| POST   | /users                            | OWNER                     | Cria um novo professor/owner                         |
| PATCH  | /users/:id                        | OWNER                     | Edita nome / ativa-desativa professor                |
| PATCH  | /users/:id/password                | OWNER                     | Redefine a senha de um professor                     |
| POST   | /lessons                          | Autenticado               | Cria uma aula (professor = usuario logado)           |
| GET    | /lessons                          | Autenticado               | Lista aulas do periodo atual (ou start/end)          |
| PATCH  | /lessons/:id                       | Dono da aula/OWNER        | Edita uma aula (reaplica as regras de valor)         |
| DELETE | /lessons/:id                       | Dono da aula/OWNER        | Exclui uma aula                                      |
| GET    | /closing/me                        | Autenticado               | Fechamento do professor logado                       |
| GET    | /closing/general                    | OWNER                     | Fechamento geral de todos os professores/aulas       |
| GET    | /closing/professor/:id               | OWNER                     | Fechamento detalhado de um professor especifico      |

## Regras de negócio reforçadas nesta versão

- `PATCH /lessons/:id` agora reaplica a mesma regra do `POST`: TURMA
  sempre grava R$28, PERSONAL exige valor válido — trocar o tipo numa
  edição não deixa mais o valor "órfão" do tipo anterior.
- O auxiliar é validado no backend (existe, está ativo, é PROFESSOR) e
  não pode ser a mesma pessoa que o professor da aula.
- O fechamento geral é baseado nas **aulas do período**, não só em
  usuários ativos — um professor desligado no meio do período continua
  aparecendo no relatório se tiver dado aula naquele período.
- Datas usam aritmética UTC explícita (imune ao fuso horário do
  servidor de deploy) em vez do construtor `new Date(y,m,d)` local.

## Testes

```bash
npm run test
```

Cobre principalmente:
- `src/closing/period.util.spec.ts` — cálculo do período de fechamento em casos de borda (meses de 28/29/30/31 dias, independência do fuso do servidor)
- `src/lessons/lessons.service.spec.ts` — regras de valor TURMA/PERSONAL na criação e edição, validação de auxiliar, permissões de edição/exclusão

## Deploy em produção — checklist rápido

- [ ] `JWT_SECRET` forte e diferente do de desenvolvimento
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` configurada com a URL real do frontend
- [ ] `npx prisma migrate deploy` (não `migrate dev`) para aplicar as migrations
- [ ] `npx ts-node prisma/seed-prod.ts` uma única vez, para criar o OWNER real
- [ ] Senha do OWNER real diferente de `123456`
