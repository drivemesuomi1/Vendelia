import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { ApiErrorDTO } from "@vendelia/shared";
import { AppError } from "../domain/errors";

/** Converts thrown errors into consistent JSON: { error, message, fields? }. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | AppError | ZodError, req, reply) => {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_";
        fields[key] ??= issue.message;
      }
      const body: ApiErrorDTO = { error: "validation_failed", message: "Validation failed", fields };
      return reply.status(400).send(body);
    }
    if (err instanceof AppError) {
      const body: ApiErrorDTO = { error: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) };
      return reply.status(err.status).send(body);
    }
    const status = (err as FastifyError).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    const body: ApiErrorDTO = {
      error: status === 429 ? "rate_limited" : status >= 500 ? "internal_error" : (err as FastifyError).code ?? "bad_request",
      message: status >= 500 ? "Something went wrong" : err.message,
    };
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: "not_found", message: "Route not found" } satisfies ApiErrorDTO);
  });
}
