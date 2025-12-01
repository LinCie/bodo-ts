import type { NextFunction, Request, Response } from "express"

import { DomainError } from "#domain/shared/index.js"
import { env } from "#infrastructure/config/index.js"
import { logger } from "#infrastructure/logging/index.js"
import { mapErrorToHttpStatus } from "#presentation/shared/http-status.mapper.js"
import z, { ZodError } from "zod"

function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Log all errors
  logger.error(err)

  if (err instanceof ZodError) {
    res.status(400).send({
      errors: z.treeifyError(err),
      message: "Validation failed",
    })
    return
  }

  if (err instanceof DomainError) {
    const statusCode = mapErrorToHttpStatus(err)
    res.status(statusCode).send({ message: err.message, code: err.code })
    return
  }

  // For other errors, hide details in production
  if (env.NODE_ENV === "production") {
    res.status(500).send({ message: "Internal Server Error" })
    return
  }

  // In development, provide more details
  if (err instanceof Error) {
    res.status(500).send({ message: err.message, stack: err.stack })
    return
  }

  res.status(500).send({ message: "An unknown error occurred" })
}

export { errorMiddleware }
