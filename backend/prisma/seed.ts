import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'owner@arena.com' },
    update: {},
    create: {
      name: 'Dono da Arena',
      email: 'owner@arena.com',
      password: senhaHash,
      role: Role.OWNER,
    },
  });

  const nomes = ['Joao', 'Carlos', 'Pedro', 'Lucas', 'Marcos', 'Rafael'];
  for (const nome of nomes) {
    await prisma.user.upsert({
      where: { email: `${nome.toLowerCase()}@arena.com` },
      update: {},
      create: {
        name: nome,
        email: `${nome.toLowerCase()}@arena.com`,
        password: senhaHash,
        role: Role.PROFESSOR,
      },
    });
  }

  console.log('Seed concluido. Senha padrao para todos: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
