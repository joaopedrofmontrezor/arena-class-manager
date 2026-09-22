import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

async function main() {
  console.log('== Seed de PRODUCAO — cria somente o usuario OWNER real ==');
  console.log('(rode isso uma unica vez, apontando DATABASE_URL para o banco de producao)\n');

  const name = await ask('Nome do dono da arena: ');
  const email = await ask('E-mail de login: ');
  const password = await ask('Senha (minimo 6 caracteres): ');

  if (password.length < 6) {
    console.error('Senha muito curta. Abortando.');
    process.exit(1);
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.error(`Ja existe um usuario com o e-mail ${email}. Abortando.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hash, role: Role.OWNER },
  });

  console.log(`\nOWNER "${name}" criado com sucesso.`);
  console.log('Os professores reais devem ser cadastrados pelo proprio OWNER dentro do sistema (tela de Professores), nao por seed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
