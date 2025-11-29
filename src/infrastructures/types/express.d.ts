import "express"
import type { z } from "zod"

declare module "express" {
  export interface Request {
    validated?: z.infer<z.ZodType>
  }
}
