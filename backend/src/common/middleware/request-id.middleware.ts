import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming
      : randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
