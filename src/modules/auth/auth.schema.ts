import z from "zod"

const signinSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
})

const refreshSchema = z.object({
  refresh_token: z.string(),
})

const signoutSchema = z.object({
  refresh_token: z.string(),
})

type RefreshInput = z.infer<typeof refreshSchema>
type SigninInput = z.infer<typeof signinSchema>
type SignupInput = z.infer<typeof signupSchema>
type SignoutInput = z.infer<typeof signoutSchema>

export { refreshSchema, signinSchema, signoutSchema, signupSchema }
export type { RefreshInput, SigninInput, SignoutInput, SignupInput }
