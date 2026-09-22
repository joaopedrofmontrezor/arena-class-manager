import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser = require("cookie-parser");

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ? frontendUrl.split(",").map((s) => s.trim()) : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Arena Futevolei API rodando na porta ${port}`);
  if (!frontendUrl) {
    console.warn(
      "AVISO: FRONTEND_URL nao configurada — CORS esta aberto para qualquer origem. Configure FRONTEND_URL em producao.",
    );
  }
}
bootstrap();
