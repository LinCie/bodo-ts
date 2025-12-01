import {
  CreateItemUseCase,
  FindItemByIdUseCase,
} from "#application/items/index.js"
import type { Result } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import { Item } from "#domain/items/index.js"
import { ValidationError } from "#domain/shared/errors/index.js"
import type { PaginatedResult } from "#domain/shared/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.3**
 *
 * For any use case execution, the result SHALL be a Result object with
 * `success: true` and `data` for successful operations, or `success: false`
 * and `error` for failed operations.
 */
describe("Use Case Result Format - Property Tests", () => {
  // Arbitrary for valid item names (non-empty strings with at least one non-whitespace char)
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for valid numeric strings
  const validNumericStringArb = fc.oneof(
    fc.constant(undefined),
    fc.float({ min: 0, max: 1000000, noNaN: true }).map(n => n.toString()),
  )

  // Arbitrary for item status
  const statusArb: fc.Arbitrary<"active" | "inactive" | "archived"> =
    fc.constantFrom("active", "inactive", "archived")

  // Arbitrary for valid CreateItemDTO
  const validCreateItemDTOArb = fc.record({
    name: validNameArb,
    price: validNumericStringArb,
    cost: validNumericStringArb,
    weight: validNumericStringArb,
    status: fc.option(statusArb, { nil: undefined }),
  })

  // Arbitrary for invalid CreateItemDTO (empty name)
  const invalidCreateItemDTOArb = fc.record({
    name: fc.constantFrom("", "   ", "\t", "\n"),
    price: validNumericStringArb,
    status: fc.option(statusArb, { nil: undefined }),
  })

  // Mock repository that successfully saves items
  const createSuccessRepository = (): ItemRepository => ({
    findById: () => Promise.resolve(null),
    findAll: (): Promise<PaginatedResult<Item>> =>
      Promise.resolve({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
    save: (entity: Item) => Promise.resolve(entity),
    update: (_id: number, entity: Partial<Item>) =>
      Promise.resolve(entity as Item),
    delete: () => Promise.resolve(),
    findBySpaceId: (): Promise<PaginatedResult<Item>> =>
      Promise.resolve({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
    findByStatus: (): Promise<PaginatedResult<Item>> =>
      Promise.resolve({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
  })

  describe("success helper function", () => {
    it("should create Result with success: true and data", () => {
      fc.assert(
        fc.property(fc.anything(), data => {
          const result = success(data)

          expect(result.success).toBe(true)
          expect(result.data).toBe(data)
          expect(result.error).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("failure helper function", () => {
    it("should create Result with success: false and error", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          violations => {
            const error = new ValidationError(violations)
            const result = failure(error)

            expect(result.success).toBe(false)
            expect(result.error).toBe(error)
            expect(result.data).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("CreateItemUseCase result format", () => {
    it("should return Result with success: true and data for valid input", async () => {
      await fc.assert(
        fc.asyncProperty(validCreateItemDTOArb, async input => {
          const repository = createSuccessRepository()
          const useCase = new CreateItemUseCase(repository)

          const result = await useCase.execute(input)

          // Result should have correct format
          expect(typeof result.success).toBe("boolean")
          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.error).toBeUndefined()

          // Data should contain the item properties
          expect(result.data?.name).toBe(input.name)
        }),
        { numRuns: 100 },
      )
    })

    it("should return Result with success: false and error for invalid input", async () => {
      await fc.assert(
        fc.asyncProperty(invalidCreateItemDTOArb, async input => {
          const repository = createSuccessRepository()
          const useCase = new CreateItemUseCase(repository)

          const result = await useCase.execute(input)

          // Result should have correct format
          expect(typeof result.success).toBe("boolean")
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.data).toBeUndefined()

          // Error should be a ValidationError
          expect(result.error).toBeInstanceOf(ValidationError)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("FindItemByIdUseCase result format", () => {
    it("should return Result with success: false when item not found", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 1000000 }), async itemId => {
          const repository = createSuccessRepository()
          const useCase = new FindItemByIdUseCase(repository)

          const result = await useCase.execute({ id: itemId })

          // Result should have correct format
          expect(typeof result.success).toBe("boolean")
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.data).toBeUndefined()

          // Error should have correct code
          expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })

    it("should return Result with success: true when item found", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000000 }),
          validNameArb,
          statusArb,
          async (itemId, name, status) => {
            const item = Item.create({ id: itemId, name, status })
            const repository: ItemRepository = {
              ...createSuccessRepository(),
              findById: () => Promise.resolve(item),
            }
            const useCase = new FindItemByIdUseCase(repository)

            const result = await useCase.execute({ id: itemId })

            // Result should have correct format
            expect(typeof result.success).toBe("boolean")
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.error).toBeUndefined()

            // Data should contain the item properties
            expect(result.data?.id).toBe(itemId)
            expect(result.data?.name).toBe(name)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("Result type invariants", () => {
    it("success and failure are mutually exclusive", () => {
      fc.assert(
        fc.property(fc.anything(), data => {
          const successResult = success(data)
          const failureResult = failure(new ValidationError(["test"]))

          // Success result should have data and no error
          expect(successResult.success).toBe(true)
          expect(successResult.error).toBeUndefined()
          expect(successResult.data).toBe(data)

          // Failure result should have error and no data
          expect(failureResult.success).toBe(false)
          expect(failureResult.data).toBeUndefined()
          expect(failureResult.error).toBeDefined()
        }),
        { numRuns: 100 },
      )
    })

    it("Result always has success boolean property", () => {
      fc.assert(
        fc.property(fc.anything(), data => {
          const successResult: Result<unknown> = success(data)
          const failureResult: Result<unknown> = failure(
            new ValidationError(["test"]),
          )

          expect(typeof successResult.success).toBe("boolean")
          expect(typeof failureResult.success).toBe("boolean")
        }),
        { numRuns: 100 },
      )
    })
  })
})
