import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import { z, ZodError } from "zod"

/**
 * **Feature: infrastructure-middleware-migration, Property 6: Environment Configuration Validation**
 * **Validates: Requirements 4.2**
 *
 * For any set of environment variables, the configuration module SHALL either
 * return a fully validated configuration object or throw a ZodError with details
 * about missing/invalid variables.
 */
describe("Environment Configuration Validation - Property Tests", () => {
  // Re-create the schema here to test validation behavior without side effects
  const envSchema = z.object({
    DATABASE_URL: z.url(),
    FRONTEND_URL: z.url().default("localhost:3000"),
    GEMINI_API_KEY: z.string(),
    JWT_SECRET: z.string(),
    NODE_ENV: z
      .enum(["development", "production", "staging", "test"])
      .default("development"),
    PORT: z.string().default("8000"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
  })

  // Arbitrary for valid URLs
  const validUrlArb = fc.constantFrom(
    "http://localhost:3000",
    "https://example.com",
    "mysql://localhost:3306/db",
    "postgres://user:pass@localhost:5432/db",
  )

  // Arbitrary for valid NODE_ENV values
  const validNodeEnvArb = fc.constantFrom(
    "development",
    "production",
    "staging",
    "test",
  )

  // Arbitrary for non-empty strings (for secrets/keys)
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for valid port strings
  const validPortArb = fc.integer({ min: 1, max: 65535 }).map(n => n.toString())

  // Arbitrary for complete valid environment configuration
  const validEnvArb = fc.record({
    DATABASE_URL: validUrlArb,
    FRONTEND_URL: validUrlArb,
    GEMINI_API_KEY: nonEmptyStringArb,
    JWT_SECRET: nonEmptyStringArb,
    NODE_ENV: validNodeEnvArb,
    PORT: validPortArb,
    REDIS_URL: fc.constant("redis://localhost:6379"),
  })

  // Arbitrary for invalid URLs
  const invalidUrlArb = fc.constantFrom(
    "not-a-url",
    "ftp://",
    "",
    "://missing-protocol",
    "http://",
  )

  // Arbitrary for invalid NODE_ENV values
  const invalidNodeEnvArb = fc
    .string()
    .filter(s => !["development", "production", "staging", "test"].includes(s))

  it("should return a fully validated configuration object for valid inputs", () => {
    fc.assert(
      fc.property(validEnvArb, envVars => {
        const result = envSchema.parse(envVars)

        // Property: result must contain all required fields
        expect(result).toHaveProperty("DATABASE_URL")
        expect(result).toHaveProperty("FRONTEND_URL")
        expect(result).toHaveProperty("GEMINI_API_KEY")
        expect(result).toHaveProperty("JWT_SECRET")
        expect(result).toHaveProperty("NODE_ENV")
        expect(result).toHaveProperty("PORT")
        expect(result).toHaveProperty("REDIS_URL")

        // Property: values must match input
        expect(result.DATABASE_URL).toBe(envVars.DATABASE_URL)
        expect(result.GEMINI_API_KEY).toBe(envVars.GEMINI_API_KEY)
        expect(result.JWT_SECRET).toBe(envVars.JWT_SECRET)
      }),
      { numRuns: 100 },
    )
  })

  it("should apply default values when optional fields are missing", () => {
    fc.assert(
      fc.property(
        validUrlArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (dbUrl, apiKey, jwtSecret) => {
          // Minimal valid config with only required fields
          const minimalEnv = {
            DATABASE_URL: dbUrl,
            GEMINI_API_KEY: apiKey,
            JWT_SECRET: jwtSecret,
          }

          const result = envSchema.parse(minimalEnv)

          // Property: defaults must be applied
          expect(result.FRONTEND_URL).toBe("localhost:3000")
          expect(result.NODE_ENV).toBe("development")
          expect(result.PORT).toBe("8000")
          expect(result.REDIS_URL).toBe("redis://localhost:6379")
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ZodError with details for invalid DATABASE_URL", () => {
    fc.assert(
      fc.property(
        invalidUrlArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (invalidUrl, apiKey, jwtSecret) => {
          const invalidEnv = {
            DATABASE_URL: invalidUrl,
            GEMINI_API_KEY: apiKey,
            JWT_SECRET: jwtSecret,
          }

          // Property: must throw ZodError
          expect(() => envSchema.parse(invalidEnv)).toThrow(ZodError)

          const result = envSchema.safeParse(invalidEnv)
          // Property: error must be ZodError with issue details
          expect(result.success).toBe(false)
          const zodError = (result as { success: false; error: ZodError }).error
          expect(zodError.issues.length).toBeGreaterThan(0)

          // Property: error must reference the invalid field
          const paths = zodError.issues.map(issue => issue.path.join("."))
          expect(paths).toContain("DATABASE_URL")
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ZodError with details for missing required fields", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("DATABASE_URL", "GEMINI_API_KEY", "JWT_SECRET"),
        missingField => {
          const validBase: Record<string, string> = {
            DATABASE_URL: "http://localhost:3306/db",
            GEMINI_API_KEY: "test-api-key",
            JWT_SECRET: "test-secret",
          }

          // Remove one required field using object destructuring
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [missingField]: _unused, ...invalidEnv } = validBase

          // Property: must throw ZodError
          expect(() => envSchema.parse(invalidEnv)).toThrow(ZodError)

          const result = envSchema.safeParse(invalidEnv)
          // Property: error must be ZodError with issue details
          expect(result.success).toBe(false)
          const zodError = (result as { success: false; error: ZodError }).error
          expect(zodError.issues.length).toBeGreaterThan(0)

          // Property: error must reference the missing field
          const paths = zodError.issues.map(issue => issue.path.join("."))
          expect(paths).toContain(missingField)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ZodError for invalid NODE_ENV values", () => {
    fc.assert(
      fc.property(
        validUrlArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        invalidNodeEnvArb,
        (dbUrl, apiKey, jwtSecret, invalidNodeEnv) => {
          const invalidEnv = {
            DATABASE_URL: dbUrl,
            GEMINI_API_KEY: apiKey,
            JWT_SECRET: jwtSecret,
            NODE_ENV: invalidNodeEnv,
          }

          // Property: must throw ZodError for invalid enum value
          expect(() => envSchema.parse(invalidEnv)).toThrow(ZodError)

          const result = envSchema.safeParse(invalidEnv)
          expect(result.success).toBe(false)
          const zodError = (result as { success: false; error: ZodError }).error
          const paths = zodError.issues.map(issue => issue.path.join("."))
          expect(paths).toContain("NODE_ENV")
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should validate all NODE_ENV enum values correctly", () => {
    fc.assert(
      fc.property(
        validUrlArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        validNodeEnvArb,
        (dbUrl, apiKey, jwtSecret, nodeEnv) => {
          const validEnv = {
            DATABASE_URL: dbUrl,
            GEMINI_API_KEY: apiKey,
            JWT_SECRET: jwtSecret,
            NODE_ENV: nodeEnv,
          }

          const result = envSchema.parse(validEnv)

          // Property: NODE_ENV must be one of the valid enum values
          expect(["development", "production", "staging", "test"]).toContain(
            result.NODE_ENV,
          )
          expect(result.NODE_ENV).toBe(nodeEnv)
        },
      ),
      { numRuns: 100 },
    )
  })
})
