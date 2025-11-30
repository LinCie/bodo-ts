import type { RequestHandler } from "express"
import type { ZodType } from "zod"

import { validatorMiddleware } from "#middlewares/validator.middleware.js"
import express from "express"

interface RouteDefinition {
  method: "get" | "post" | "put" | "delete" | "patch"
  path: string
  handler: RequestHandler
  schema?: ZodType
  querySchema?: ZodType
  paramsSchema?: ZodType
  middlewares?: RequestHandler[]
}

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
        // Middlewares
        const mws = (middlewares ?? []).map(mw =>
          this.asyncHandler(mw.bind(this)),
        )

        // Validators
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

        // Handler
        const finalHandler = this.asyncHandler(handler.bind(this))

        this.router[method](path, ...mws, ...validators, finalHandler)
      },
    )
  }

  private asyncHandler(fn: RequestHandler): RequestHandler {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }
}

export { Controller }
export type { RouteDefinition }
