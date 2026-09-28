import { randomUUID } from "crypto";
import { IncomingMessage } from "http";
import { Params } from "nestjs-pino";

export function buildLoggerOptions(): Params {
  const isProd = process.env.NODE_ENV === "production";

  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),

      genReqId: (req: IncomingMessage) => {
        const withId = req as IncomingMessage & { id?: string };
        return withId.id ?? randomUUID();
      },

      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
        ],
        censor: "[REDACTED]",
      },

      transport: isProd
        ? undefined
        : {
            target: "pino-pretty",
            options: { singleLine: true, translateTime: "SYS:HH:MM:ss" },
          },
    },
  };
}
