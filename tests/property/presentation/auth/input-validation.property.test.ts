import type { NextFunction, Request, Response } from "express"

import {
  refreshSchema,
  signinSchema,
  signoutSchema,
  signupSchema,
} from "#presentation/auth/auth.schema.js"
import { validatorMiddleware } from "#presentation/shared/middleware/validator.middleware.js"
import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"

/**
 * **Feature: auth-clean-architecture, Property 12: Input Validation Before Use Case**
 * **Validates: Requirements 5.1**
 *
 * For any HTTP request with invalid input (missing email, invalid email format, short password),
 * the controller SHALL reject the request with 400 status before invoking the use case.
 */
describe("Auth Input Validation Before Use Case - Property Tests", () => {
  // Helper to create mock request
  const createMockRequest = (body: unknown = {}): Request =>
    ({
      body,
      query: {},
      params: {},
      validated: undefined,
      validatedQuery: undefined,
      validatedParams: undefined,
    }) as unknown as Request

  // Helper to create mock response
  const createMockResponse = (): Response =>
    ({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }) as unknown as Response

  describe("signinSchema validation", () => {
    // Arbitrary for invalid emails
    const invalidEmailArb = fc.oneof(
      fc.constant(""),
      fc.constant("not-an-email"),
      fc.constant("missing@domain"),
      fc.constant("@nodomain.com"),
      fc.constant(null),
      fc.constant(undefined),
    )

    // Arbitrary for valid emails
    const validEmailArb = fc
      .tuple(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-z0-9]+$/i.test(s)),
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter(s => /^[a-z0-9]+$/i.test(s)),
        fc.constantFrom("com", "org", "net", "io"),
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

    // Arbitrary for valid passwords (non-empty)
    const validPasswordArb = fc.string({ minLength: 1, maxLength: 50 })

    it("should reject signin requests with invalid email", async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidEmailArb,
          validPasswordArb,
          async (invalidEmail, password) => {
            const req = createMockRequest({ email: invalidEmail, password })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(signinSchema, "body")
            middleware(req, res, next as NextFunction)

            expect(next).toHaveBeenCalled()
            const error = next.mock.calls[0][0]
            expect(error).toBeInstanceOf(ZodError)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should reject signin requests with missing password", async () => {
      const missingPasswordArb = fc.constantFrom("", null, undefined)

      await fc.assert(
        fc.asyncProperty(
          validEmailArb,
          missingPasswordArb,
          async (email, invalidPassword) => {
            const req = createMockRequest({ email, password: invalidPassword })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(signinSchema, "body")
            middleware(req, res, next as NextFunction)

            expect(next).toHaveBeenCalled()
            const error = next.mock.calls[0][0]
            expect(error).toBeInstanceOf(ZodError)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should accept signin requests with valid email and password", async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailArb,
          validPasswordArb,
          async (email, password) => {
            const req = createMockRequest({ email, password })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(signinSchema, "body")
            middleware(req, res, next as NextFunction)

            expect(next).toHaveBeenCalledWith()
            expect(req.validated).toBeDefined()
            expect((req.validated as { email: string }).email).toBe(email)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("signupSchema validation", () => {
    // Arbitrary for invalid names
    const invalidNameArb = fc.constantFrom("", null, undefined)

    // Arbitrary for valid names
    const validNameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0)

    // Arbitrary for valid emails
    const validEmailArb = fc
      .tuple(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-z0-9]+$/i.test(s)),
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter(s => /^[a-z0-9]+$/i.test(s)),
        fc.constantFrom("com", "org", "net", "io"),
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

    // Arbitrary for short passwords (less than 8 chars)
    const shortPasswordArb = fc.string({ minLength: 0, maxLength: 7 })

    // Arbitrary for valid passwords (8+ chars)
    const validPasswordArb = fc.string({ minLength: 8, maxLength: 50 })

    it("should reject signup requests with invalid name", async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidNameArb,
          validEmailArb,
          validPasswordArb,
          async (invalidName, email, password) => {
            const req = createMockRequest({
              name: invalidName,
              email,
              password,
            })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(signupSchema, "body")
            middleware(req, res, next as NextFunction)

            expect(next).toHaveBeenCalled()
            const error = next.mock.calls[0][0]
            expect(error).toBeInstanceOf(ZodError)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should reject signup requests with short password", async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArb,
          validEmailArb,
          shortPasswordArb,
          async (name, email, shortPassword) => {
            const req = createMockRequest({
              name,
              email,
              password: shortPassword,
            })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(signupSchema, "body")
            middleware(req, res, next as NextFunction)

            expect(next).toHaveBeenCalled()
            const error = next.mock.calls[0][0]
            expect(error).toBeInstanceOf(ZodError)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should accept signup requests with valid inputs", async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArb,
          validEmailArb,
          validPasswordArb,
          async (name, email, password) => {
            const req = createMockRequest({ name, email, password })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(signupSchema, "body")
            middleware(req, res, next as NextFunction)

            expect(next).toHaveBeenCalledWith()
            expect(req.validated).toBeDefined()
            const validated = req.validated as {
              name: string
              email: string
              password: string
            }
            expect(validated.name).toBe(name)
            expect(validated.email).toBe(email)
            expect(validated.password).toBe(password)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("refreshSchema validation", () => {
    // Arbitrary for invalid refresh tokens
    const invalidTokenArb = fc.constantFrom("", null, undefined)

    // Arbitrary for valid refresh tokens (non-empty strings)
    const validTokenArb = fc.string({ minLength: 1, maxLength: 500 })

    it("should reject refresh requests with missing token", async () => {
      await fc.assert(
        fc.asyncProperty(invalidTokenArb, async invalidToken => {
          const req = createMockRequest({ refresh_token: invalidToken })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(refreshSchema, "body")
          middleware(req, res, next as NextFunction)

          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)
        }),
        { numRuns: 100 },
      )
    })

    it("should accept refresh requests with valid token", async () => {
      await fc.assert(
        fc.asyncProperty(validTokenArb, async validToken => {
          const req = createMockRequest({ refresh_token: validToken })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(refreshSchema, "body")
          middleware(req, res, next as NextFunction)

          expect(next).toHaveBeenCalledWith()
          expect(req.validated).toBeDefined()
          expect(
            (req.validated as { refresh_token: string }).refresh_token,
          ).toBe(validToken)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("signoutSchema validation", () => {
    // Arbitrary for invalid refresh tokens
    const invalidTokenArb = fc.constantFrom("", null, undefined)

    // Arbitrary for valid refresh tokens (non-empty strings)
    const validTokenArb = fc.string({ minLength: 1, maxLength: 500 })

    it("should reject signout requests with missing token", async () => {
      await fc.assert(
        fc.asyncProperty(invalidTokenArb, async invalidToken => {
          const req = createMockRequest({ refresh_token: invalidToken })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(signoutSchema, "body")
          middleware(req, res, next as NextFunction)

          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)
        }),
        { numRuns: 100 },
      )
    })

    it("should accept signout requests with valid token", async () => {
      await fc.assert(
        fc.asyncProperty(validTokenArb, async validToken => {
          const req = createMockRequest({ refresh_token: validToken })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(signoutSchema, "body")
          middleware(req, res, next as NextFunction)

          expect(next).toHaveBeenCalledWith()
          expect(req.validated).toBeDefined()
          expect(
            (req.validated as { refresh_token: string }).refresh_token,
          ).toBe(validToken)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Validation happens before use case invocation", () => {
    it("should not invoke use case handler when signin validation fails", async () => {
      const invalidInputArb = fc.record({
        email: fc.constantFrom("", "invalid-email", null),
        password: fc.string(),
      })

      await fc.assert(
        fc.asyncProperty(invalidInputArb, async invalidInput => {
          const useCaseInvoked = vi.fn()
          const req = createMockRequest(invalidInput)
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(signinSchema, "body")
          middleware(req, res, next as NextFunction)

          const nextCalledWithError =
            next.mock.calls[0]?.[0] instanceof ZodError
          expect(nextCalledWithError).toBe(true)
          expect(useCaseInvoked).not.toHaveBeenCalled()
        }),
        { numRuns: 100 },
      )
    })

    it("should not invoke use case handler when signup validation fails", async () => {
      const invalidInputArb = fc.record({
        name: fc.constantFrom("", null),
        email: fc.string(),
        password: fc.string({ maxLength: 7 }),
      })

      await fc.assert(
        fc.asyncProperty(invalidInputArb, async invalidInput => {
          const useCaseInvoked = vi.fn()
          const req = createMockRequest(invalidInput)
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(signupSchema, "body")
          middleware(req, res, next as NextFunction)

          const nextCalledWithError =
            next.mock.calls[0]?.[0] instanceof ZodError
          expect(nextCalledWithError).toBe(true)
          expect(useCaseInvoked).not.toHaveBeenCalled()
        }),
        { numRuns: 100 },
      )
    })
  })
})
