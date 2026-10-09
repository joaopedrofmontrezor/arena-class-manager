# Arena Futevôlei — Controle de Aulas e Fechamentos

Sistema web para controlar aulas dadas por professores (turmas e personais)
e gerar o fechamento financeiro de cada um — quanto cada professor tem a
receber por período, incluindo o que fez como auxiliar em aulas de outros
professores.

Dois perfis de acesso:

- **Professor**: lança suas próprias aulas e acompanha seu fechamento.
- **Owner (dono da arena)**: tudo que o professor faz, além de ver o
  fechamento geral de todos os professores e cadastrar/editar professores.

## Stack

| Camada     | Tecnologia                                                        |
| ---------- | ------------------------------------------------------------------ |
| Backend    | NestJS 10 + TypeScript, Prisma ORM, PostgreSQL, JWT + Passport      |
| Frontend   | React 18 + TypeScript, Vite, Tailwind CSS, React Router             |
| Banco      | PostgreSQL gerenciado (Neon) em produção                            |
| Deploy     | Backend no Railway · Frontend no Vercel                             |
| CI         | GitHub Actions (lint, type-check, testes, build, Docker)            |

## Estrutura do repositório

```
.
├── backend/            # API NestJS
│   ├── src/
│   │   ├── auth/        # Login, JWT, CSRF, guards de role
│   │   ├── users/       # Cadastro/edição de professores (Owner)
│   │   ├── lessons/     # CRUD de aulas
│   │   ├── closing/     # Fechamento (resumo por professor e geral)
│   │   ├── health/      # GET /health (usado por monitoramento)
│   │   └── common/      # DTOs, validators, filtros e middlewares compartilhados
│   └── prisma/          # schema.prisma e migrations
├── frontend/            # SPA React
│   └── src/
│       ├── pages/        # Login, Dashboard, Aulas, Fechamento, Professores...
│       ├── context/       # AuthContext (sessão do usuário logado)
│       └── api/           # Cliente axios configurado
├── docker-compose.yml    # Ambiente local completo (Postgres + backend + frontend)
└── .github/workflows/    # CI de backend/frontend + backup semanal do banco
```

## Rodando localmente

### Opção A — Docker Compose (mais simples, ambiente completo)

```bash
docker compose up --build
```

Depois, aplique as migrations contra o banco do compose (a partir do seu
terminal, não de dentro do container — veja o comentário no topo do
`docker-compose.yml` para o porquê):

```bash
cd backend
DATABASE_URL=postgresql://arena:arena@localhost:5432/arena_futevolei \
  npx prisma migrate deploy
```

- Backend: http://localhost:3000
- Frontend: http://localhost:8080

### Opção B — Backend e frontend direto (hot reload)

Backend:

```bash
cd backend
cp .env.example .env   # ajuste DATABASE_URL/DIRECT_URL e JWT_SECRET
npm install
npx prisma migrate dev
npm run start:dev
```

Frontend:

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável       | Descrição                                                        |
| -------------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | Connection string do Postgres (pooled, usada em runtime)           |
| `DIRECT_URL`   | Connection string direta (usada pelo Prisma para migrations)        |
| `JWT_SECRET`   | Segredo para assinar os tokens de sessão — único por ambiente       |
| `PORT`         | Porta da API (padrão 3000)                                         |
| `NODE_ENV`     | `development` ou `production` (liga CORS restrito e cookies seguros)|
| `FRONTEND_URL` | Origem(s) permitida(s) no CORS, separadas por vírgula                |
| `LOG_LEVEL`    | Nível de log do Pino (padrão: `info` em produção, `debug` em dev)    |

Veja `backend/.env.example` e `backend/.env.staging.example` para modelos
completos.

### Frontend (`frontend/.env`)

| Variável       | Descrição                         |
| -------------- | ------------------------------------ |
| `VITE_API_URL` | URL base da API backend              |

## Autenticação

Login é feito por e-mail/senha (`POST /auth/login`), que retorna um JWT.
Em produção, backend e frontend ficam em domínios diferentes (Railway +
Vercel); como o Safari/iOS bloqueia cookies de terceiros definidos via
fetch/XHR nesse cenário, o token também é devolvido no corpo da resposta e
guardado em memória no frontend, enviado via header `Authorization: Bearer`
em cada requisição (o cookie HttpOnly continua funcionando normalmente em
navegadores que o aceitam). Ações de escrita (POST/PATCH/DELETE) exigem
também um token CSRF obtido em `GET /auth/csrf`.

## Backup do banco

Além do point-in-time restore do Neon (janela de poucas horas no plano
Free), há um backup semanal automático via GitHub Actions
(`.github/workflows/db-backup.yml`): roda todo domingo, gera um `pg_dump`
compactado do banco de produção e disponibiliza como artefato na aba
**Actions** do GitHub por 90 dias. Pode ser disparado manualmente a
qualquer momento em Actions → "Backup do banco de produção" → **Run
workflow**. Requer o secret `BACKUP_DATABASE_URL` configurado no
repositório (a `DIRECT_URL` do Neon).

## Deploy

- **Backend**: Railway, a partir do `backend/Dockerfile`. Variáveis de
  ambiente configuradas no painel do Railway (mesmas da tabela acima).
- **Frontend**: Vercel, buildado com `VITE_API_URL` apontando para a URL
  pública do backend no Railway.
- **Banco**: Neon (Postgres gerenciado), com `DATABASE_URL` (pooled) para
  runtime e `DIRECT_URL` para migrations.

Migrations em produção são aplicadas manualmente (`npx prisma migrate
deploy`), nunca automaticamente no boot da aplicação — para que alguém
sempre revise a migration antes dela rodar contra o banco real.

## CI

Dois workflows no GitHub Actions, disparados em pushes/PRs que tocam cada
pasta:

- `backend-ci.yml`: Prisma generate + migrate, type-check, testes
  unitários e E2E, build, `npm audit`, build da imagem Docker.
- `frontend-ci.yml`: type-check, build.

## Licença

Projeto privado/interno da Arena Futevôlei.
