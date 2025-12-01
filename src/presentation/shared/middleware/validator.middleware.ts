import type { NextFunction, Request, Response } from "express"
import type { ZodType } from "zod"

const validatorMiddleware =
  (schema: ZodType, type: "body" | "query" | "params") =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req[type])
      switch (type) {
        case "body":
          req.validated = result
          break
        case "query":
          req.validatedQuery = result
          break
        case "params":
          req.validatedParams = result
          break
      }
      next()
    } catch (error) {
      next(error)
    }
  }

export { validatorMiddleware }
