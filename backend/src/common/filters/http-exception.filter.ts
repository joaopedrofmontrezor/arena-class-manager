import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();

    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = "Erro interno do servidor.";

    let error: string | undefined;

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === "object") {
      const data = exceptionResponse as ErrorResponse;

      if (data.message !== undefined) {
        message = data.message;
      }

      error = data.error;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(error ? { error } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
