import type { NextFunction, Request, Response } from "express"

import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"
import { z, ZodError } from "zod"

// Mock the infrastructure modules before importing the error middleware
vi.mock("#infrastructure/logging/index.js", () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock("#infrastructure/config/index.js", () => ({
  env: {
    NODE_ENV: "development",
    DATABASE_URL: "mysql://test",
    GEMINI_API_KEY: "test-key",
    JWT_SECRET: "test-secret",
    FRONTEND_URL: "http://localhost:3000",
    PORT: "8000",
    REDIS_URL: "redis://localhost:6379",
  },
}))

// Import after mocks are set up
import { errorMiddleware } from "#presentation/shared/middleware/error.middleware.js"

// Reserved JavaScript property names that can cause issues with z.treeifyError
const RESERVED_PROPERTIES = [
  "constructor",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
]

/**
 * **Feature: infrastructure-middleware-migration, Property 3: ZodError Response Format**
 * **Validates: Requirements 2.2**
 *
 * For any ZodError thrown during request processing, the error middleware SHALL
 * return a response with status 400 and a body containing an `errors` field
 * with validation details.
 */
describe("ZodError Response Format - Property Tests", () => {
  // Helper to create mock request
  const createMockRequest = (): Request =>
    ({
      body: {},
      query: {},
      params: {},
    }) as unknown as Request

  // Helper to create mock response with tracking
  const createMockResponse = () => {
    const res = {
      statusCode: 0,
      body: null as unknown,
      status: vi.fn().mockImplementation((code: number) => {
        res.statusCode = code
        return res
      }),
      send: vi.fn().mockImplementation((body: unknown) => {
        res.body = body
        return res
      }),
    }
    return res as unknown as Response & { statusCode: number; body: unknown }
  }

  const createMockNext = (): NextFunction => vi.fn()

  describe("ZodError handling", () => {
    // Arbitrary for field names - exclude reserved JavaScript property names
    const fieldNameArb = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter(
        s =>
          /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) &&
          !RESERVED_PROPERTIES.includes(s),
      )

    // Arbitrary for invalid values that would fail string validation
    const invalidValueArb = fc.oneof(
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
    )

    it("should return status 400 for any ZodError", () => {
      fc.assert(
        fc.property(fieldNameArb, fieldName => {
          const schema = z.object({ [fieldName]: z.string() })
          const result = schema.safeParse({ [fieldName]: 123 }) // Invalid: number instead of string
          const zodError = (result as { success: false; error: ZodError }).error

          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(zodError, req, res, next)

          expect(res.statusCode).toBe(400)
        }),
        { numRuns: 100 },
      )
    })

    it("should include errors field in response body for ZodError", () => {
      fc.assert(
        fc.property(
          fieldNameArb,
          invalidValueArb,
          (fieldName, invalidValue) => {
            const schema = z.object({ [fieldName]: z.string() })
            const result = schema.safeParse({ [fieldName]: invalidValue })
            const zodError = (result as { success: false; error: ZodError })
              .error

            const req = createMockRequest()
            const res = createMockResponse()
            const next = createMockNext()

            errorMiddleware(zodError, req, res, next)

            // Property: response body must have errors field
            expect(res.body).toHaveProperty("errors")
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should include message field in response body for ZodError", () => {
      fc.assert(
        fc.property(fieldNameArb, fieldName => {
          const schema = z.object({ [fieldName]: z.string() })
          const result = schema.safeParse({ [fieldName]: 123 })
          const zodError = (result as { success: false; error: ZodError }).error

          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(zodError, req, res, next)

          // Property: response body must have message field
          expect(res.body).toHaveProperty("message", "Validation failed")
        }),
        { numRuns: 100 },
      )
    })

    it("should handle ZodError with multiple field violations", () => {
      fc.assert(
        fc.property(
          fc.array(fieldNameArb, { minLength: 2, maxLength: 5 }),
          fieldNames => {
            // Create unique field names
            const uniqueFields = [...new Set(fieldNames)]
            if (uniqueFields.length < 2) return // Skip if not enough unique fields

            const schemaShape: Record<string, z.ZodString> = {}
            const invalidData: Record<string, number> = {}

            for (const field of uniqueFields) {
              schemaShape[field] = z.string()
              invalidData[field] = 123 // Invalid: number instead of string
            }

            const schema = z.object(schemaShape)
            const result = schema.safeParse(invalidData)
            const zodError = (result as { success: false; error: ZodError })
              .error

            const req = createMockRequest()
            const res = createMockResponse()
            const next = createMockNext()

            errorMiddleware(zodError, req, res, next)

            expect(res.statusCode).toBe(400)
            expect(res.body).toHaveProperty("errors")
            expect(res.body).toHaveProperty("message", "Validation failed")
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
