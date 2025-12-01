import { Item } from "#domain/items/item.entity.js"
import { BusinessRuleViolationError } from "#domain/shared/errors/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: clean-architecture, Property 2: Entity Invariant Preservation**
 * **Validates: Requirements 1.3**
 *
 * For any valid Item entity and any state-changing operation (archive, update),
 * the resulting entity SHALL maintain all business invariants (non-empty name,
 * valid status transitions).
 */
describe("Item Entity Invariant Preservation - Property Tests", () => {
  // Arbitrary for valid item names (non-empty strings with at least one non-whitespace char)
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for valid numeric strings
  const validNumericStringArb = fc.oneof(
    fc.constant(undefined),
    fc.float({ min: 0, max: 1000000, noNaN: true }).map(n => n.toString()),
  )

  // Arbitrary for non-archived status
  const nonArchivedStatusArb: fc.Arbitrary<"active" | "inactive"> =
    fc.constantFrom("active", "inactive")

  // Arbitrary for valid Item entity
  const validItemArb = fc
    .record({
      name: validNameArb,
      price: validNumericStringArb,
      cost: validNumericStringArb,
      weight: validNumericStringArb,
      status: nonArchivedStatusArb,
      description: fc.option(fc.string(), { nil: null }),
      code: fc.option(fc.string(), { nil: null }),
      sku: fc.option(fc.string(), { nil: null }),
    })
    .map(props => Item.create(props))

  // Arbitrary for archived Item entity
  const archivedItemArb = fc
    .record({
      name: validNameArb,
      price: validNumericStringArb,
      cost: validNumericStringArb,
      weight: validNumericStringArb,
      description: fc.option(fc.string(), { nil: null }),
    })
    .map(props =>
      Item.create({
        ...props,
        status: "archived",
      }),
    )

  it("archive operation preserves name invariant", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        const archivedItem = item.archive()

        // Name must remain non-empty after archive
        expect(archivedItem.name.trim().length).toBeGreaterThan(0)
        expect(archivedItem.name).toBe(item.name)
        expect(archivedItem.status).toBe("archived")
      }),
      { numRuns: 100 },
    )
  })

  it("restore operation preserves name invariant", () => {
    fc.assert(
      fc.property(archivedItemArb, item => {
        const restoredItem = item.restore()

        // Name must remain non-empty after restore
        expect(restoredItem.name.trim().length).toBeGreaterThan(0)
        expect(restoredItem.name).toBe(item.name)
        expect(restoredItem.status).toBe("active")
      }),
      { numRuns: 100 },
    )
  })

  it("update operation preserves name invariant when name is not changed", () => {
    fc.assert(
      fc.property(
        validItemArb,
        fc.option(fc.string(), { nil: null }),
        (item, newDescription) => {
          const updatedItem = item.update({ description: newDescription })

          // Name must remain non-empty after update
          expect(updatedItem.name.trim().length).toBeGreaterThan(0)
          expect(updatedItem.name).toBe(item.name)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("update operation with valid name preserves name invariant", () => {
    fc.assert(
      fc.property(validItemArb, validNameArb, (item, newName) => {
        const updatedItem = item.update({ name: newName })

        // Name must remain non-empty after update
        expect(updatedItem.name.trim().length).toBeGreaterThan(0)
        expect(updatedItem.name).toBe(newName)
      }),
      { numRuns: 100 },
    )
  })

  it("archive throws BusinessRuleViolationError for already archived items", () => {
    fc.assert(
      fc.property(archivedItemArb, item => {
        expect(() => item.archive()).toThrow(BusinessRuleViolationError)
      }),
      { numRuns: 100 },
    )
  })

  it("restore throws BusinessRuleViolationError for non-archived items", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        expect(() => item.restore()).toThrow(BusinessRuleViolationError)
      }),
      { numRuns: 100 },
    )
  })

  it("archive then restore returns to active status", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        const archivedItem = item.archive()
        const restoredItem = archivedItem.restore()

        expect(restoredItem.status).toBe("active")
        expect(restoredItem.name).toBe(item.name)
      }),
      { numRuns: 100 },
    )
  })

  it("update preserves numeric field validity", () => {
    fc.assert(
      fc.property(
        validItemArb,
        validNumericStringArb,
        validNumericStringArb,
        (item, newPrice, newCost) => {
          const updatedItem = item.update({ price: newPrice, cost: newCost })

          // Entity should be valid after update
          expect(updatedItem).toBeInstanceOf(Item)
          expect(updatedItem.price).toBe(newPrice)
          expect(updatedItem.cost).toBe(newCost)
        },
      ),
      { numRuns: 100 },
    )
  })
})
