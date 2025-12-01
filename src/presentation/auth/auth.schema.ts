import { z } from "zod"

/**
 * Schema for signin input validation.
 * Validates email format and password presence.
 */
const signinSchema = z.object({
  email: z.email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
})

/**
 * Schema for signup input validation.
 * Validates name, email format, and password minimum length.
 */
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

/**
 * Schema for refresh token input validation.
 */
const refreshSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
})

/**
 * Schema for signout input validation.
 */
const signoutSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
})

type SigninSchemaInput = z.infer<typeof signinSchema>
type SignupSchemaInput = z.infer<typeof signupSchema>
type RefreshSchemaInput = z.infer<typeof refreshSchema>
type SignoutSchemaInput = z.infer<typeof signoutSchema>

export { refreshSchema, signinSchema, signoutSchema, signupSchema }
export type {
  RefreshSchemaInput,
  SigninSchemaInput,
  SignoutSchemaInput,
  SignupSchemaInput,
}
