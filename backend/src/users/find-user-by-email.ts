import type { PrismaClient, User } from "@prisma/client";
import { normalizeEmail } from "../common/transformers/normalize-email";

export async function findUserByEmail(
  prisma: Pick<PrismaClient, "$queryRaw">,
  email: string,
): Promise<User | null> {
  const normalizado = normalizeEmail(email);

  const linhas = await prisma.$queryRaw<User[]>`
    SELECT * FROM "User"
    WHERE lower("email") = ${normalizado}
    ORDER BY "createdAt" ASC
    LIMIT 1`;

  return linhas[0] ?? null;
}
