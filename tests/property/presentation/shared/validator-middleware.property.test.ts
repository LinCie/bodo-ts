import type { NextFunction, Request, Response } from "express"

import { validatorMiddleware } from "#presentation/shared/middleware/validator.middleware.js"
import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"
import { z, ZodError } from "zod"

/**
 * **Feature: infrastructure-middleware-migration, Property 5: Validator Middleware Data Attachment**
 * **Validates: Requirements 3.2**
 *
 * For any valid request data that passes Zod schema validation, the validator
 * middleware SHALL attach the parsed data to the appropriate request property
 * (validated, validatedQuery, or validatedParams) based on the validation type.
 */
describe("Validator Middleware Data Attachment - Property Tests", () => {
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

  describe("Body validation attachment", () => {
    // Arbitrary for valid string values
    const validStringArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0)

    // Arbitrary for valid numbers
    const validNumberArb = fc.integer({ min: 1, max: 1000000 })

    it("should attach validated body data to req.validated", () => {
      fc.assert(
        fc.property(validStringArb, validNumberArb, (name, count) => {
          const schema = z.object({
            name: z.string(),
            count: z.number(),
          })

          const req = createMockRequest({ name, count })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "body")
          middleware(req, res, next as NextFunction)

          // Property: next should be called without error
          expect(next).toHaveBeenCalledWith()

          // Property: validated data should be attached to req.validated
          expect(req.validated).toBeDefined()
          expect((req.validated as { name: string; count: number }).name).toBe(
            name,
          )
          expect((req.validated as { name: string; count: number }).count).toBe(
            count,
          )

          // Property: other validated properties should remain undefined
          expect(req.validatedQuery).toBeUndefined()
          expect(req.validatedParams).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })

    it("should preserve parsed data types in req.validated", () => {
      fc.assert(
        fc.property(
          validStringArb,
          validNumberArb,
          fc.boolean(),
          (str, num, bool) => {
            const schema = z.object({
              stringField: z.string(),
              numberField: z.number(),
              boolField: z.boolean(),
            })

            const req = createMockRequest({
              stringField: str,
              numberField: num,
              boolField: bool,
            })
            const res = createMockResponse()
            const next = vi.fn()

            const middleware = validatorMiddleware(schema, "body")
            middleware(req, res, next as NextFunction)

            const validated = req.validated as {
              stringField: string
              numberField: number
              boolField: boolean
            }

            // Property: types should be preserved after validation
            expect(typeof validated.stringField).toBe("string")
            expect(typeof validated.numberField).toBe("number")
            expect(typeof validated.boolField).toBe("boolean")
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("Query validation attachment", () => {
    const validQueryValueArb = fc.integer({ min: 1, max: 1000000 })

    it("should attach validated query data to req.validatedQuery", () => {
      fc.assert(
        fc.property(validQueryValueArb, spaceId => {
          const schema = z.object({
            space_id: z.number(),
          })

          const req = createMockRequest({}, { space_id: spaceId })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "query")
          middleware(req, res, next as NextFunction)

          // Property: next should be called without error
          expect(next).toHaveBeenCalledWith()

          // Property: validated data should be attached to req.validatedQuery
          expect(req.validatedQuery).toBeDefined()
          expect((req.validatedQuery as { space_id: number }).space_id).toBe(
            spaceId,
          )

          // Property: other validated properties should remain undefined
          expect(req.validated).toBeUndefined()
          expect(req.validatedParams).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Params validation attachment", () => {
    const validIdArb = fc.integer({ min: 1, max: 1000000 })

    it("should attach validated params data to req.validatedParams", () => {
      fc.assert(
        fc.property(validIdArb, id => {
          const schema = z.object({
            id: z.number(),
          })

          const req = createMockRequest({}, {}, { id })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "params")
          middleware(req, res, next as NextFunction)

          // Property: next should be called without error
          expect(next).toHaveBeenCalledWith()

          // Property: validated data should be attached to req.validatedParams
          expect(req.validatedParams).toBeDefined()
          expect((req.validatedParams as { id: number }).id).toBe(id)

          // Property: other validated properties should remain undefined
          expect(req.validated).toBeUndefined()
          expect(req.validatedQuery).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Validation failure handling", () => {
    it("should pass ZodError to next when validation fails", () => {
      // Arbitrary for invalid values (non-string for string field)
      const invalidValueArb = fc.oneof(
        fc.integer(),
        fc.boolean(),
        fc.constant(null),
        fc.constant(undefined),
      )

      fc.assert(
        fc.property(invalidValueArb, invalidValue => {
          const schema = z.object({
            name: z.string(),
          })

          const req = createMockRequest({ name: invalidValue })
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "body")
          middleware(req, res, next as NextFunction)

          // Property: next should be called with ZodError
          expect(next).toHaveBeenCalled()
          const error = next.mock.calls[0][0]
          expect(error).toBeInstanceOf(ZodError)

          // Property: req.validated should remain undefined on failure
          expect(req.validated).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Validation type isolation", () => {
    it("should only attach to body property when type is body", () => {
      const validDataArb = fc.record({
        field: fc.string({ minLength: 1 }),
      })

      fc.assert(
        fc.property(validDataArb, data => {
          const schema = z.object({
            field: z.string(),
          })

          const req = createMockRequest(data, {}, {})
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "body")
          middleware(req, res, next as NextFunction)

          expect(req.validated).toBeDefined()
          expect(req.validatedQuery).toBeUndefined()
          expect(req.validatedParams).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })

    it("should only attach to query property when type is query", () => {
      const validDataArb = fc.record({
        field: fc.string({ minLength: 1 }),
      })

      fc.assert(
        fc.property(validDataArb, data => {
          const schema = z.object({
            field: z.string(),
          })

          const req = createMockRequest({}, data, {})
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "query")
          middleware(req, res, next as NextFunction)

          expect(req.validated).toBeUndefined()
          expect(req.validatedQuery).toBeDefined()
          expect(req.validatedParams).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })

    it("should only attach to params property when type is params", () => {
      const validDataArb = fc.record({
        field: fc.string({ minLength: 1 }),
      })

      fc.assert(
        fc.property(validDataArb, data => {
          const schema = z.object({
            field: z.string(),
          })

          const req = createMockRequest({}, {}, data)
          const res = createMockResponse()
          const next = vi.fn()

          const middleware = validatorMiddleware(schema, "params")
          middleware(req, res, next as NextFunction)

          expect(req.validated).toBeUndefined()
          expect(req.validatedQuery).toBeUndefined()
          expect(req.validatedParams).toBeDefined()
        }),
        { numRuns: 100 },
      )
    })
  })
})
