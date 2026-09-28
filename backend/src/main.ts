import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { validateEnv } from "./config/validate-env";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.enableShutdownHooks();

  app.use(requestIdMiddleware);

  app.use(helmet());
  app.use(cookieParser());

  const isProd = process.env.NODE_ENV === "production";
  const frontendUrl = process.env.FRONTEND_URL;

  app.enableCors({
    origin: frontendUrl ? frontendUrl.split(",").map((s) => s.trim()) : !isProd,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Arena Futevolei API rodando na porta ${port}`);
  if (!frontendUrl) {
    logger.warn(
      "FRONTEND_URL nao configurada — CORS esta aberto para qualquer origem (modo desenvolvimento).",
    );
  }
}

bootstrap().catch((err) => {
  console.error("Falha ao iniciar a aplicação:", err);
  process.exit(1);
});
