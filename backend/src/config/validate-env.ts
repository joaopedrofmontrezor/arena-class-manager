export function validateEnv(): void {
  const erros: string[] = [];

  if (!process.env.DATABASE_URL) {
    erros.push("DATABASE_URL não configurada.");
  } else if (!process.env.DATABASE_URL.startsWith("postgres")) {
    erros.push(
      "DATABASE_URL não parece ser uma connection string do PostgreSQL válida.",
    );
  }

  if (!process.env.DIRECT_URL) {
    erros.push(
      "DIRECT_URL não configurada (necessária para as migrations do Prisma).",
    );
  }

  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !process.env.FRONTEND_URL) {
    erros.push(
      "FRONTEND_URL é obrigatória quando NODE_ENV=production — sem ela o CORS ficaria aberto para qualquer origem, o que não é seguro em produção.",
    );
  }

  if (erros.length > 0) {
    console.error(
      "\n🚨 Configuração inválida — a aplicação não pode iniciar:\n",
    );
    for (const erro of erros) console.error(`  - ${erro}`);
    console.error("");
    process.exit(1);
  }
}
