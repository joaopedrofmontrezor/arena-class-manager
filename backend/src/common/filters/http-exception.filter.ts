import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

interface ErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

interface JsonErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

function mapPrismaError(
  exception: Prisma.PrismaClientKnownRequestError,
): { status: number; message: string } | null {
  switch (exception.code) {
    case "P2002": {
      const alvo = Array.isArray(exception.meta?.target)
        ? (exception.meta.target as string[]).join(", ")
        : "campo único";
      return {
        status: HttpStatus.CONFLICT,
        message: `Já existe um registro com esse valor (${alvo}).`,
      };
    }
    case "P2025":
      return {
        status: HttpStatus.NOT_FOUND,
        message: "Registro não encontrado.",
      };
    case "P2003":
      return {
        status: HttpStatus.BAD_REQUEST,
        message: "Referência inválida (o registro relacionado não existe).",
      };
    default:
      return null;
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.buildBody(exception, request);

    if (body.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(exception);
    }

    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown, request: Request): JsonErrorBody {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string | string[] = exception.message;
      let error: string | undefined;

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === "object") {
        const data = exceptionResponse as ErrorResponse;
        if (data.message !== undefined) message = data.message;
        error = data.error;
      }

      return { statusCode: status, message, error, timestamp, path };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapeado = mapPrismaError(exception);
      if (mapeado) {
        return {
          statusCode: mapeado.status,
          message: mapeado.message,
          timestamp,
          path,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Erro interno do servidor.",
      timestamp,
      path,
    };
  }
}
