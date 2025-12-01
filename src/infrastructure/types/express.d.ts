import "express"
import type { z } from "zod"

declare module "express" {
  export interface Request {
    validatedQuery?: z.infer<z.ZodType>
    validatedParams?: z.infer<z.ZodType>
    validated?: z.infer<z.ZodType>
  }
}
