# Arena Futevolei - Frontend

React + Vite + TypeScript + Tailwind, consumindo a API do backend.

## Setup

```bash
npm install
cp .env.example .env
# ajuste VITE_API_URL se o backend nao estiver em localhost:3000

npm run dev
```

Abre em `http://localhost:5173`.

## Login de teste

Use os usuarios criados pelo seed do backend (senha `123456`):

- `owner@arena.com` -> ve o dashboard, aulas, fechamento pessoal e o
  fechamento geral de todos os professores.
- `joao@arena.com` (ou qualquer outro professor) -> ve o dashboard,
  cadastra/edita/exclui suas proprias aulas e ve seu fechamento.

## Estrutura

```
src/
  api/client.ts       -> axios com token JWT automatico + logout em 401
  context/AuthContext -> login/logout/estado do usuario
  components/
    Layout.tsx         -> cabecalho + navegacao inferior
    ProtectedRoute.tsx -> bloqueia rotas sem login (ou sem o role certo)
  pages/
    Login.tsx
    Dashboard.tsx       -> resumo do periodo atual
    NewLesson.tsx       -> cadastro rapido de aula (o fluxo mais usado)
    MyLessons.tsx        -> lista/edita/exclui aulas do periodo
    Closing.tsx          -> fechamento do professor logado
    GeneralClosing.tsx   -> fechamento de todos (somente OWNER)
```

## Decisoes de design

- Paleta pensada para o contexto (quadra de areia, sol forte): teal
  profundo para estrutura, coral vivo para a acao principal ("+ Nova
  aula"), verde-mar para valores de auxiliar/dinheiro.
- Tipografia: Space Grotesk para numeros e titulos (legibilidade e
  personalidade em telas pequenas), Inter para o corpo/formularios.
- Fluxo de cadastro de aula pre-preenche data/hora com o momento atual
  e reseta o formulario apos salvar, para o professor lancar varias
  aulas seguidas sem re-digitar nada.

## Build para producao

```bash
npm run build
```

Gera a pasta `dist/`, pronta para deploy em Vercel, Netlify ou qualquer
host estatico. Lembre de configurar `VITE_API_URL` apontando para o
backend em producao nas variaveis de ambiente da plataforma escolhida.
