import type { Result } from "#application/shared/index.js"
import type { RequestHandler, Response } from "express"
import type { ZodType } from "zod"

import express from "express"

import { DomainError } from "#domain/shared/index.js"
import { validatorMiddleware } from "#presentation/shared/middleware/validator.middleware.js"
import { mapErrorToHttpStatus } from "./http-status.mapper.js"

interface RouteDefinition {
  method: "get" | "post" | "put" | "delete" | "patch"
  path: string
  handler: RequestHandler
  schema?: ZodType
  querySchema?: ZodType
  paramsSchema?: ZodType
  middlewares?: RequestHandler[]
}

/**
 * Enhanced base controller with result handling for clean architecture.
 * Handles HTTP concerns and maps domain errors to HTTP responses.
 */
abstract class Controller {
  public readonly router = express.Router({ mergeParams: true })

  protected bindRoutes(routes: RouteDefinition[]): void {
    routes.forEach(
      ({
        method,
        path,
        handler,
        middlewares,
        schema,
        querySchema,
        paramsSchema,
      }) => {
        const mws = (middlewares ?? []).map(mw =>
          this.asyncHandler(mw.bind(this)),
        )

        const validators = []
        if (schema) {
          validators.push(validatorMiddleware(schema, "body"))
        }
        if (querySchema) {
          validators.push(validatorMiddleware(querySchema, "query"))
        }
        if (paramsSchema) {
          validators.push(validatorMiddleware(paramsSchema, "params"))
        }

        const finalHandler = this.asyncHandler(handler.bind(this))
        this.router[method](path, ...mws, ...validators, finalHandler)
      },
    )
  }

  /**
   * Handles a Result from a use case and sends appropriate HTTP response.
   */
  protected handleResult<T>(
    res: Response,
    result: Result<T>,
    successStatus = 200,
  ): void {
    if (result.success) {
      res.status(successStatus).json(result.data)
    } else if (result.error) {
      this.handleError(res, result.error)
    }
  }

  /**
   * Handles a domain error and sends appropriate HTTP error response.
   */
  protected handleError(res: Response, error: DomainError): void {
    const statusCode = mapErrorToHttpStatus(error)
    res.status(statusCode).json({
      error: error.message,
      code: error.code,
    })
  }

  private asyncHandler(fn: RequestHandler): RequestHandler {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }
}

export { Controller }
export type { RouteDefinition }
