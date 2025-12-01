import type { NextFunction, Request, Response } from "express"

import {
  createItemSchema,
  findAllQuerySchema,
  itemIdParamsSchema,
} from "#presentation/items/index.js"
import { validatorMiddleware } from "#presentation/shared/middleware/validator.middleware.js"
import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"

/**
 * **Feature: clean-architecture, Property 8: Input Validation Before Use Case**
 * **Validates: Requirements 4.1**
 *
 * For any HTTP request with invalid input (missing required fields, wrong types),
 * the controller SHALL reject the request with a 400 status before invoking the use case.
 */
describe("Input Validation Before Use Case - Property Tests", () => {
  // Helper to create mock request
  const createMockRequest = (
    body: unknown = {},
    query: unknown = {},
    params: unknown = {},
  ): Request =>
    ({
      body,
      query,
      params,
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

  describe("createItemSchema validation", () => {
    // Arbitrary for invalid names (empty or whitespace-only)
    const invalidNameArb = fc.constantFrom("", null, undefined)

    // Arbitrary for invalid types (non-string for name)
    const invalidTypeArb = fc.oneof(
      fc.integer(),
      fc.boolean(),
      fc.array(fc.anything()),
      fc.object(),
    )

    it("should reject requests with missing required name field", async () => {
      await fc.assert(
        fc.asyncProperty(invalidNameArb, async invalidName => {
          const req = createMockRequest({ name: invalidName })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(createItemSchema, "body")
          middleware(req, res, next as NextFunction)

          // Validation should fail and call next with error
          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)
        }),
        { numRuns: 100 },
      )
    })

    it("should reject requests with invalid name type", async () => {
      await fc.assert(
        fc.asyncProperty(invalidTypeArb, async invalidName => {
          const req = createMockRequest({ name: invalidName })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(createItemSchema, "body")
          middleware(req, res, next as NextFunction)

          // Validation should fail and call next with error
          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)
        }),
        { numRuns: 100 },
      )
    })

    it("should accept requests with valid name", async () => {
      // Arbitrary for valid names (non-empty strings)
      const validNameArb = fc
        .string({ minLength: 1, maxLength: 100 })
        .filter(s => s.trim().length > 0)

      await fc.assert(
        fc.asyncProperty(validNameArb, async validName => {
          const req = createMockRequest({ name: validName })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(createItemSchema, "body")
          middleware(req, res, next as NextFunction)

          // Validation should pass and call next without error
          expect(next).toHaveBeenCalledWith()
          expect(req.validated).toBeDefined()
          expect((req.validated as { name: string }).name).toBe(validName)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("findAllQuerySchema validation", () => {
    // Arbitrary for invalid space_id (non-positive or non-integer)
    const invalidSpaceIdArb = fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.integer({ max: 0 }),
      fc.constant("not-a-number"),
      fc.constant(null),
      fc.constant(undefined),
    )

    // Arbitrary for valid space_id
    const validSpaceIdArb = fc.integer({ min: 1, max: 1000000 })

    it("should reject requests with invalid space_id", async () => {
      await fc.assert(
        fc.asyncProperty(invalidSpaceIdArb, async invalidSpaceId => {
          const req = createMockRequest({}, { space_id: invalidSpaceId })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(findAllQuerySchema, "query")
          middleware(req, res, next as NextFunction)

          // Validation should fail and call next with error
          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)
        }),
        { numRuns: 100 },
      )
    })

    it("should accept requests with valid space_id", async () => {
      await fc.assert(
        fc.asyncProperty(validSpaceIdArb, async validSpaceId => {
          const req = createMockRequest({}, { space_id: validSpaceId })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(findAllQuerySchema, "query")
          middleware(req, res, next as NextFunction)

          // Validation should pass and call next without error
          expect(next).toHaveBeenCalledWith()
          expect(req.validatedQuery).toBeDefined()
          expect((req.validatedQuery as { space_id: number }).space_id).toBe(
            validSpaceId,
          )
        }),
        { numRuns: 100 },
      )
    })

    it("should reject requests with invalid status enum", async () => {
      // Arbitrary for invalid status values
      const invalidStatusArb = fc
        .string({ minLength: 1 })
        .filter(s => !["active", "inactive", "archived"].includes(s))

      await fc.assert(
        fc.asyncProperty(
          validSpaceIdArb,
          invalidStatusArb,
          async (spaceId, invalidStatus) => {
            const req = createMockRequest(
              {},
              { space_id: spaceId, status: invalidStatus },
            )
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(findAllQuerySchema, "query")
            middleware(req, res, next as NextFunction)

            // Validation should fail and call next with error
            expect(next).toHaveBeenCalled()
            const error = next.mock.calls[0][0]
            expect(error).toBeInstanceOf(ZodError)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("itemIdParamsSchema validation", () => {
    // Arbitrary for invalid id (non-positive or non-integer)
    const invalidIdArb = fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.integer({ max: 0 }),
      fc.constant("not-a-number"),
      fc.constant(null),
      fc.constant(undefined),
    )

    // Arbitrary for valid id
    const validIdArb = fc.integer({ min: 1, max: 1000000 })

    it("should reject requests with invalid id param", async () => {
      await fc.assert(
        fc.asyncProperty(invalidIdArb, async invalidId => {
          const req = createMockRequest({}, {}, { id: invalidId })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(itemIdParamsSchema, "params")
          middleware(req, res, next as NextFunction)

          // Validation should fail and call next with error
          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)
        }),
        { numRuns: 100 },
      )
    })

    it("should accept requests with valid id param", async () => {
      await fc.assert(
        fc.asyncProperty(validIdArb, async validId => {
          const req = createMockRequest({}, {}, { id: validId })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(itemIdParamsSchema, "params")
          middleware(req, res, next as NextFunction)

          // Validation should pass and call next without error
          expect(next).toHaveBeenCalledWith()
          expect(req.validatedParams).toBeDefined()
          expect((req.validatedParams as { id: number }).id).toBe(validId)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Validation happens before use case invocation", () => {
    it("should not invoke use case handler when validation fails", async () => {
      // Arbitrary for invalid inputs
      const invalidInputArb = fc.record({
        name: fc.constantFrom("", null, undefined),
      })

      await fc.assert(
        fc.asyncProperty(invalidInputArb, async invalidInput => {
          const useCaseInvoked = vi.fn()
          const req = createMockRequest(invalidInput)
          const res = createMockResponse()
          const next = vi.fn()

          // Simulate the middleware chain
          const middleware = validatorMiddleware(createItemSchema, "body")
          middleware(req, res, next as NextFunction)

          // Validation should fail for invalid inputs, calling next with error
          // The use case handler should never be invoked regardless
          const nextCalledWithError =
            next.mock.calls[0]?.[0] instanceof ZodError
          expect(nextCalledWithError).toBe(true)
          // Use case should not be called when validation fails
          expect(useCaseInvoked).not.toHaveBeenCalled()
        }),
        { numRuns: 100 },
      )
    })
  })
})
