import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.url(),
  FRONTEND_URL: z.url().default("localhost:3000"),
  JWT_SECRET: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "staging", "test"])
    .default("development"),
  PORT: z.string().default("8000"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
})

export const env = envSchema.parse(process.env)
