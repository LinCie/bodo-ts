import {
  CreateItemUseCase,
  DeleteItemUseCase,
  FindItemByIdUseCase,
  UpdateItemUseCase,
} from "#application/items/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import { Item } from "#domain/items/index.js"
import {
  BusinessRuleViolationError,
  DomainError,
  EntityNotFoundError,
  ValidationError,
} from "#domain/shared/errors/index.js"
import type { PaginatedResult } from "#domain/shared/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: clean-architecture, Property 5: Domain Error Propagation**
 * **Validates: Requirements 2.4**
 *
 * For any use case that encounters a business rule violation, the use case SHALL
 * return a Result with a domain-specific error (ValidationError, EntityNotFoundError,
 * BusinessRuleViolationError) rather than throwing a generic Error.
 */
describe("Domain Error Propagation - Property Tests", () => {
  // Arbitrary for valid item names (non-empty strings with at least one non-whitespace char)
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for item status
  const statusArb: fc.Arbitrary<"active" | "inactive" | "archived"> =
    fc.constantFrom("active", "inactive", "archived")

  // Arbitrary for item IDs
  const itemIdArb = fc.integer({ min: 1, max: 1000000 })

  // Mock repository factory
  const createMockRepository = (
    overrides: Partial<ItemRepository> = {},
  ): ItemRepository => ({
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
    ...overrides,
  })

  describe("ValidationError propagation", () => {
    it("CreateItemUseCase returns ValidationError for invalid input", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom("", "   ", "\t", "\n"),
          async emptyName => {
            const repository = createMockRepository()
            const useCase = new CreateItemUseCase(repository)

            const result = await useCase.execute({ name: emptyName })

            // Should return failure, not throw
            expect(result.success).toBe(false)
            expect(result.error).toBeInstanceOf(DomainError)
            expect(result.error).toBeInstanceOf(ValidationError)
            expect(result.error?.code).toBe("VALIDATION_ERROR")
          },
        ),
        { numRuns: 100 },
      )
    })

    it("UpdateItemUseCase returns ValidationError for invalid update data", async () => {
      await fc.assert(
        fc.asyncProperty(
          itemIdArb,
          validNameArb,
          statusArb,
          async (itemId, name, status) => {
            const existingItem = Item.create({ id: itemId, name, status })
            const repository = createMockRepository({
              findById: () => Promise.resolve(existingItem),
              update: (_id: number, entity: Partial<Item>) =>
                Promise.resolve(entity as Item),
            })
            const useCase = new UpdateItemUseCase(repository)

            // Update with empty name should return ValidationError
            const result = await useCase.execute({
              id: itemId,
              data: { name: "" },
            })

            expect(result.success).toBe(false)
            expect(result.error).toBeInstanceOf(DomainError)
            expect(result.error).toBeInstanceOf(ValidationError)
            expect(result.error?.code).toBe("VALIDATION_ERROR")
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("EntityNotFoundError propagation", () => {
    it("FindItemByIdUseCase returns EntityNotFoundError when item not found", async () => {
      await fc.assert(
        fc.asyncProperty(itemIdArb, async itemId => {
          const repository = createMockRepository({
            findById: () => Promise.resolve(null),
          })
          const useCase = new FindItemByIdUseCase(repository)

          const result = await useCase.execute({ id: itemId })

          // Should return failure, not throw
          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(DomainError)
          expect(result.error).toBeInstanceOf(EntityNotFoundError)
          expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })

    it("UpdateItemUseCase returns EntityNotFoundError when item not found", async () => {
      await fc.assert(
        fc.asyncProperty(itemIdArb, validNameArb, async (itemId, newName) => {
          const repository = createMockRepository({
            findById: () => Promise.resolve(null),
          })
          const useCase = new UpdateItemUseCase(repository)

          const result = await useCase.execute({
            id: itemId,
            data: { name: newName },
          })

          // Should return failure, not throw
          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(DomainError)
          expect(result.error).toBeInstanceOf(EntityNotFoundError)
          expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })

    it("DeleteItemUseCase returns EntityNotFoundError when item not found", async () => {
      await fc.assert(
        fc.asyncProperty(itemIdArb, async itemId => {
          const repository = createMockRepository({
            findById: () => Promise.resolve(null),
          })
          const useCase = new DeleteItemUseCase(repository)

          const result = await useCase.execute({ id: itemId })

          // Should return failure, not throw
          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(DomainError)
          expect(result.error).toBeInstanceOf(EntityNotFoundError)
          expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("BusinessRuleViolationError propagation", () => {
    it("DeleteItemUseCase returns BusinessRuleViolationError when archiving already archived item", async () => {
      await fc.assert(
        fc.asyncProperty(itemIdArb, validNameArb, async (itemId, name) => {
          // Create an already archived item
          const archivedItem = Item.create({
            id: itemId,
            name,
            status: "archived",
          })
          const repository = createMockRepository({
            findById: () => Promise.resolve(archivedItem),
          })
          const useCase = new DeleteItemUseCase(repository)

          const result = await useCase.execute({ id: itemId })

          // Should return failure, not throw
          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(DomainError)
          expect(result.error).toBeInstanceOf(BusinessRuleViolationError)
          expect(result.error?.code).toBe("BUSINESS_RULE_VIOLATION")
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Error type consistency", () => {
    it("all domain errors have a code property", async () => {
      await fc.assert(
        fc.asyncProperty(fc.constantFrom("", "   ", "\t"), async emptyName => {
          const repository = createMockRepository()
          const useCase = new CreateItemUseCase(repository)

          const result = await useCase.execute({ name: emptyName })

          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(typeof result.error?.code).toBe("string")
          expect(result.error?.code.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 },
      )
    })

    it("domain errors are never thrown, always returned in Result", async () => {
      await fc.assert(
        fc.asyncProperty(fc.constantFrom("", "   ", "\t"), async emptyName => {
          const repository = createMockRepository()
          const useCase = new CreateItemUseCase(repository)

          // This should not throw
          let threwError = false
          try {
            const result = await useCase.execute({ name: emptyName })
            // Result should be a failure
            expect(result.success).toBe(false)
          } catch {
            threwError = true
          }

          expect(threwError).toBe(false)
        }),
        { numRuns: 100 },
      )
    })
  })
})
