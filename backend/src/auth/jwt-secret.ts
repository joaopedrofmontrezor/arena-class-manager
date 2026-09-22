export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error(
      "JWT_SECRET nao configurado (ou muito curto). Defina uma string forte de pelo menos 16 caracteres na variavel de ambiente JWT_SECRET antes de subir a aplicacao.",
    );
  }
  return secret;
}
