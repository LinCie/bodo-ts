import type { NextFunction, Request, Response } from "express"

import * as fc from "fast-check"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Use vi.hoisted to create the mock object before vi.mock is hoisted
const mockEnv = vi.hoisted(() => ({
  NODE_ENV: "production" as string,
  DATABASE_URL: "mysql://test",
  GEMINI_API_KEY: "test-key",
  JWT_SECRET: "test-secret",
  FRONTEND_URL: "http://localhost:3000",
  PORT: "8000",
  REDIS_URL: "redis://localhost:6379",
}))

// Mock the infrastructure modules before importing the error middleware
vi.mock("#infrastructure/logging/index.js", () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock("#infrastructure/config/index.js", () => ({
  env: mockEnv,
}))

// Import after mocks are set up
import { errorMiddleware } from "#presentation/shared/middleware/error.middleware.js"

/**
 * **Feature: infrastructure-middleware-migration, Property 4: Production Error Hiding**
 * **Validates: Requirements 2.4**
 *
 * For any unknown error (not ZodError or DomainError) in production mode,
 * the error middleware SHALL return status 500 with a generic message
 * that does not contain stack traces or internal error details.
 */
describe("Production Error Hiding - Property Tests", () => {
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

  beforeEach(() => {
    mockEnv.NODE_ENV = "production"
  })

  afterEach(() => {
    mockEnv.NODE_ENV = "development"
  })

  describe("Production mode error handling", () => {
    // Arbitrary for error messages that might contain sensitive info
    const sensitiveMessageArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 200 }),
      fc.constant("Database connection failed: password=secret123"),
      fc.constant("SQL Error: SELECT * FROM users WHERE id=1"),
      fc.constant("Internal error at /home/user/app/src/service.ts:42"),
      fc.constant("TypeError: Cannot read property 'password' of undefined"),
    )

    it("should return status 500 for unknown errors in production", () => {
      fc.assert(
        fc.property(sensitiveMessageArb, message => {
          const error = new Error(message)
          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(error, req, res, next)

          expect(res.statusCode).toBe(500)
        }),
        { numRuns: 100 },
      )
    })

    it("should return generic message without exposing error details in production", () => {
      // Use specific sensitive messages that should never appear in production responses
      const sensitiveInfoArb = fc.oneof(
        fc.constant("Database connection failed: password=secret123"),
        fc.constant("SQL Error: SELECT * FROM users WHERE id=1"),
        fc.constant("Internal error at /home/user/app/src/service.ts:42"),
        fc.constant("TypeError: Cannot read property 'password' of undefined"),
        fc.constant("Connection refused to mysql://admin:password@localhost"),
        fc.constant("JWT_SECRET=mysecretkey123"),
        fc.constant("API_KEY: sk-1234567890abcdef"),
      )

      fc.assert(
        fc.property(sensitiveInfoArb, message => {
          const error = new Error(message)
          error.stack = `Error: ${message}\n    at Object.<anonymous> (/app/src/service.ts:42:15)`

          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(error, req, res, next)

          const body = res.body as { message: string; stack?: string }

          // Property: response should have generic message
          expect(body.message).toBe("Internal Server Error")

          // Property: response should NOT contain the original sensitive error message
          expect(body.message).not.toContain(message)

          // Property: response should NOT contain stack trace
          expect(body.stack).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })

    it("should not expose stack traces in production", () => {
      fc.assert(
        fc.property(sensitiveMessageArb, message => {
          const error = new Error(message)
          error.stack = `Error: ${message}
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:636:15)
    at Function.Module._load (internal/modules/cjs/loader.js:562:25)
    at Module.require (internal/modules/cjs/loader.js:692:17)`

          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(error, req, res, next)

          const body = res.body as { message: string; stack?: string }

          // Property: stack trace should never be exposed in production
          expect(body.stack).toBeUndefined()
          expect(JSON.stringify(body)).not.toContain("at ")
          expect(JSON.stringify(body)).not.toContain(".js:")
          expect(JSON.stringify(body)).not.toContain(".ts:")
        }),
        { numRuns: 100 },
      )
    })

    it("should handle non-Error objects in production", () => {
      // Arbitrary for various non-Error throwable values
      const nonErrorArb = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.object(),
        fc.constant(null),
        fc.constant(undefined),
      )

      fc.assert(
        fc.property(nonErrorArb, nonError => {
          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(nonError, req, res, next)

          // Property: should return 500 for any non-Error value
          expect(res.statusCode).toBe(500)

          const body = res.body as { message: string }
          // Property: should return generic message
          expect(body.message).toBe("Internal Server Error")
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Development mode error handling (contrast)", () => {
    beforeEach(() => {
      mockEnv.NODE_ENV = "development"
    })

    it("should expose error details in development mode", () => {
      const sensitiveMessageArb = fc.string({ minLength: 1, maxLength: 200 })

      fc.assert(
        fc.property(sensitiveMessageArb, message => {
          const error = new Error(message)
          error.stack = `Error: ${message}\n    at test.ts:1:1`

          const req = createMockRequest()
          const res = createMockResponse()
          const next = createMockNext()

          errorMiddleware(error, req, res, next)

          const body = res.body as { message: string; stack?: string }

          // Property: in development, error message should be exposed
          expect(body.message).toBe(message)

          // Property: in development, stack trace should be exposed
          expect(body.stack).toBeDefined()
        }),
        { numRuns: 100 },
      )
    })
  })
})
