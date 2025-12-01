import { Item } from "#domain/items/item.entity.js"
import { ValidationError } from "#domain/shared/errors/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: clean-architecture, Property 1: Entity Validation Consistency**
 * **Validates: Requirements 1.1**
 *
 * For any set of item properties, creating an Item entity with valid properties
 * SHALL succeed, and creating an Item entity with invalid properties (empty name,
 * invalid price format) SHALL throw a ValidationError.
 */
describe("Item Entity Validation - Property Tests", () => {
  // Arbitrary for valid item names (non-empty strings with at least one non-whitespace char)
  const validNameArb = fc
    .string({ minLength: 1 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for valid numeric strings
  const validNumericStringArb = fc.oneof(
    fc.constant(undefined),
    fc.float({ min: 0, max: 1000000, noNaN: true }).map(n => n.toString()),
  )

  // Arbitrary for invalid numeric strings (non-parseable as numbers)
  const invalidNumericStringArb = fc
    .string({ minLength: 1 })
    .filter(s => isNaN(parseFloat(s)) && s !== "")

  // Arbitrary for item status
  const statusArb: fc.Arbitrary<"active" | "inactive" | "archived"> =
    fc.constantFrom("active", "inactive", "archived")

  it("should successfully create Item with valid properties", () => {
    fc.assert(
      fc.property(
        validNameArb,
        validNumericStringArb,
        validNumericStringArb,
        validNumericStringArb,
        statusArb,
        (name, price, cost, weight, status) => {
          const item = Item.create({
            name,
            price,
            cost,
            weight,
            status,
          })

          expect(item).toBeInstanceOf(Item)
          expect(item.name).toBe(name)
          expect(item.status).toBe(status)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for empty name", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("", "   ", "\t", "\n", "  \t\n  "),
        validNumericStringArb,
        statusArb,
        (emptyName, price, status) => {
          expect(() =>
            Item.create({
              name: emptyName,
              price,
              status,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for invalid price format", () => {
    fc.assert(
      fc.property(
        validNameArb,
        invalidNumericStringArb,
        statusArb,
        (name, invalidPrice, status) => {
          expect(() =>
            Item.create({
              name,
              price: invalidPrice,
              status,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for invalid cost format", () => {
    fc.assert(
      fc.property(
        validNameArb,
        invalidNumericStringArb,
        statusArb,
        (name, invalidCost, status) => {
          expect(() =>
            Item.create({
              name,
              cost: invalidCost,
              status,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for invalid weight format", () => {
    fc.assert(
      fc.property(
        validNameArb,
        invalidNumericStringArb,
        statusArb,
        (name, invalidWeight, status) => {
          expect(() =>
            Item.create({
              name,
              weight: invalidWeight,
              status,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should include specific violation messages in ValidationError", () => {
    fc.assert(
      fc.property(invalidNumericStringArb, invalidPrice => {
        let caughtError: ValidationError | null = null
        try {
          Item.create({
            name: "",
            price: invalidPrice,
            status: "active",
          })
        } catch (error) {
          caughtError = error as ValidationError
        }

        expect(caughtError).toBeInstanceOf(ValidationError)
        expect(caughtError?.violations).toContain("Name is required")
        expect(caughtError?.violations).toContain(
          "Price must be a valid number",
        )
      }),
      { numRuns: 100 },
    )
  })
})
