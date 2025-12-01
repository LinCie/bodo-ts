import type { Response } from "express"

import type { ItemDTO } from "#application/items/item.dto.js"
import type { Result } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import {
  BusinessRuleViolationError,
  EntityNotFoundError,
  ValidationError,
} from "#domain/shared/errors/index.js"
import { Controller } from "#presentation/shared/index.js"
import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"

/**
 * **Feature: clean-architecture, Property 9: HTTP Response Format Consistency**
 * **Validates: Requirements 4.2**
 *
 * For any successful use case result, the controller SHALL respond with status 200/201
 * and JSON body containing the result data. For any failed result, the controller SHALL
 * respond with an appropriate error status and error message.
 */
describe("HTTP Response Format Consistency - Property Tests", () => {
  // Create a test controller to access protected methods
  class TestController extends Controller {
    public testHandleResult<T>(
      res: Response,
      result: Result<T>,
      successStatus = 200,
    ): void {
      this.handleResult(res, result, successStatus)
    }

    public testHandleError(res: Response, error: Error): void {
      if (
        error instanceof ValidationError ||
        error instanceof EntityNotFoundError ||
        error instanceof BusinessRuleViolationError
      ) {
        this.handleError(res, error)
      }
    }
  }

  // Helper to create mock response
  const createMockResponse = (): Response & {
    statusCode: number
    jsonData: unknown
  } => {
    const res = {
      statusCode: 0,
      jsonData: undefined as unknown,
      status: vi.fn().mockImplementation(function (
        this: Response & { statusCode: number },
        code: number,
      ) {
        this.statusCode = code
        return this
      }),
      json: vi.fn().mockImplementation(function (
        this: Response & { jsonData: unknown },
        data: unknown,
      ) {
        this.jsonData = data
        return this
      }),
      send: vi.fn().mockReturnThis(),
    }
    return res as unknown as Response & {
      statusCode: number
      jsonData: unknown
    }
  }

  // Arbitrary for valid item DTOs
  const itemDTOArb: fc.Arbitrary<ItemDTO> = fc.record({
    id: fc.option(fc.integer({ min: 1 }), { nil: undefined }),
    name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    code: fc.option(fc.string(), { nil: null }),
    sku: fc.option(fc.string(), { nil: null }),
    description: fc.option(fc.string(), { nil: null }),
    price: fc.option(fc.float({ min: 0, noNaN: true }).map(String), {
      nil: undefined,
    }),
    cost: fc.option(fc.float({ min: 0, noNaN: true }).map(String), {
      nil: undefined,
    }),
    weight: fc.option(fc.float({ min: 0, noNaN: true }).map(String), {
      nil: undefined,
    }),
    spaceId: fc.option(fc.integer({ min: 1 }), { nil: null }),
    spaceType: fc.option(fc.string(), { nil: null }),
    status: fc.constantFrom(
      "active" as const,
      "inactive" as const,
      "archived" as const,
    ),
    notes: fc.option(fc.string(), { nil: null }),
    images: fc.option(fc.anything(), { nil: undefined }),
    attributes: fc.option(fc.anything(), { nil: undefined }),
    createdAt: fc.option(fc.date(), { nil: undefined }),
    updatedAt: fc.option(fc.date(), { nil: undefined }),
    deletedAt: fc.option(fc.date(), { nil: null }),
  }) as fc.Arbitrary<ItemDTO>

  // Arbitrary for success status codes
  const successStatusArb = fc.constantFrom(200, 201)

  describe("Successful result handling", () => {
    it("should respond with specified success status and JSON data", () => {
      fc.assert(
        fc.property(itemDTOArb, successStatusArb, (itemDTO, statusCode) => {
          const controller = new TestController()
          const res = createMockResponse()
          const result = success(itemDTO)

          controller.testHandleResult(res, result, statusCode)

          // Should set correct status code
          expect(res.status).toHaveBeenCalledWith(statusCode)
          // Should send JSON data
          expect(res.json).toHaveBeenCalledWith(itemDTO)
        }),
        { numRuns: 100 },
      )
    })

    it("should respond with 200 by default for successful results", () => {
      fc.assert(
        fc.property(itemDTOArb, itemDTO => {
          const controller = new TestController()
          const res = createMockResponse()
          const result = success(itemDTO)

          controller.testHandleResult(res, result)

          // Should default to 200
          expect(res.status).toHaveBeenCalledWith(200)
          expect(res.json).toHaveBeenCalledWith(itemDTO)
        }),
        { numRuns: 100 },
      )
    })

    it("should handle any data type in successful result", () => {
      fc.assert(
        fc.property(fc.anything(), data => {
          const controller = new TestController()
          const res = createMockResponse()
          const result = success(data)

          controller.testHandleResult(res, result)

          expect(res.status).toHaveBeenCalledWith(200)
          expect(res.json).toHaveBeenCalledWith(data)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Failed result handling", () => {
    // Arbitrary for validation error violations
    const violationsArb = fc.array(fc.string({ minLength: 1 }), {
      minLength: 1,
      maxLength: 5,
    })

    it("should respond with error status and message for ValidationError", () => {
      fc.assert(
        fc.property(violationsArb, violations => {
          const controller = new TestController()
          const res = createMockResponse()
          const error = new ValidationError(violations)
          const result = failure<ItemDTO>(error)

          controller.testHandleResult(res, result)

          // Should set 400 status for validation errors
          expect(res.status).toHaveBeenCalledWith(400)
          // Should include error message and code
          expect(res.json).toHaveBeenCalledWith({
            error: error.message,
            code: "VALIDATION_ERROR",
          })
        }),
        { numRuns: 100 },
      )
    })

    it("should respond with 404 for EntityNotFoundError", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1 }),
          (entityName, id) => {
            const controller = new TestController()
            const res = createMockResponse()
            const error = new EntityNotFoundError(entityName, id)
            const result = failure<ItemDTO>(error)

            controller.testHandleResult(res, result)

            // Should set 404 status
            expect(res.status).toHaveBeenCalledWith(404)
            // Should include error message and code
            expect(res.json).toHaveBeenCalledWith({
              error: error.message,
              code: "ENTITY_NOT_FOUND",
            })
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should respond with 422 for BusinessRuleViolationError", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), message => {
          const controller = new TestController()
          const res = createMockResponse()
          const error = new BusinessRuleViolationError(message)
          const result = failure<ItemDTO>(error)

          controller.testHandleResult(res, result)

          // Should set 422 status
          expect(res.status).toHaveBeenCalledWith(422)
          // Should include error message and code
          expect(res.json).toHaveBeenCalledWith({
            error: error.message,
            code: "BUSINESS_RULE_VIOLATION",
          })
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Response format invariants", () => {
    it("successful results always have JSON body with data", () => {
      fc.assert(
        fc.property(fc.anything(), successStatusArb, (data, statusCode) => {
          const controller = new TestController()
          const res = createMockResponse()
          const result = success(data)

          controller.testHandleResult(res, result, statusCode)

          // JSON should always be called for success
          expect(res.json).toHaveBeenCalled()
          // Status should be the success status
          expect(res.statusCode).toBe(statusCode)
        }),
        { numRuns: 100 },
      )
    })

    it("failed results always have JSON body with error and code", () => {
      fc.assert(
        fc.property(violationsArb, violations => {
          const controller = new TestController()
          const res = createMockResponse()
          const error = new ValidationError(violations)
          const result = failure<unknown>(error)

          controller.testHandleResult(res, result)

          // JSON should always be called for failure
          expect(res.json).toHaveBeenCalled()
          // Response should have error and code properties
          const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock
            .calls[0][0] as { error: string; code: string }
          expect(jsonCall).toHaveProperty("error")
          expect(jsonCall).toHaveProperty("code")
          expect(typeof jsonCall.error).toBe("string")
          expect(typeof jsonCall.code).toBe("string")
        }),
        { numRuns: 100 },
      )
    })
  })

  // Arbitrary for validation error violations (defined at module level for reuse)
  const violationsArb = fc.array(fc.string({ minLength: 1 }), {
    minLength: 1,
    maxLength: 5,
  })
})
