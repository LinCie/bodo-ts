import { ItemMapper } from "#application/items/item.mapper.js"
import { Item } from "#domain/items/item.entity.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: clean-architecture, Property 3: Entity-DTO Round Trip**
 * **Validates: Requirements 1.4**
 *
 * For any valid Item entity, converting to DTO and back to entity SHALL produce
 * an equivalent entity with the same property values.
 */
describe("Item Entity-DTO Round Trip - Property Tests", () => {
  const mapper = new ItemMapper()

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

  // Arbitrary for optional ID
  const optionalIdArb = fc.option(fc.integer({ min: 1, max: 1000000 }), {
    nil: undefined,
  })

  // Arbitrary for optional string
  const optionalStringArb = fc.option(fc.string({ maxLength: 200 }), {
    nil: null,
  })

  // Arbitrary for optional date
  const optionalDateArb = fc.option(fc.date(), { nil: undefined })

  // Arbitrary for valid Item entity
  const validItemArb = fc
    .record({
      id: optionalIdArb,
      name: validNameArb,
      code: optionalStringArb,
      sku: optionalStringArb,
      description: optionalStringArb,
      price: validNumericStringArb,
      cost: validNumericStringArb,
      weight: validNumericStringArb,
      spaceId: fc.option(fc.integer({ min: 1, max: 1000000 }), { nil: null }),
      spaceType: optionalStringArb,
      status: statusArb,
      notes: optionalStringArb,
      primaryCode: optionalStringArb,
      createdAt: optionalDateArb,
      updatedAt: optionalDateArb,
      deletedAt: fc.option(fc.date(), { nil: null }),
    })
    .map(props => Item.create(props))

  it("toDTO then toDomain produces equivalent entity", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        const dto = mapper.toDTO(item)
        const reconstructedItem = mapper.toDomain(dto)

        // All properties should be equal
        expect(reconstructedItem.id).toBe(item.id)
        expect(reconstructedItem.name).toBe(item.name)
        expect(reconstructedItem.code).toBe(item.code)
        expect(reconstructedItem.sku).toBe(item.sku)
        expect(reconstructedItem.description).toBe(item.description)
        expect(reconstructedItem.price).toBe(item.price)
        expect(reconstructedItem.cost).toBe(item.cost)
        expect(reconstructedItem.weight).toBe(item.weight)
        expect(reconstructedItem.spaceId).toBe(item.spaceId)
        expect(reconstructedItem.spaceType).toBe(item.spaceType)
        expect(reconstructedItem.status).toBe(item.status)
        expect(reconstructedItem.notes).toBe(item.notes)
      }),
      { numRuns: 100 },
    )
  })

  it("toDTO preserves all entity properties", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        const dto = mapper.toDTO(item)

        expect(dto.id).toBe(item.id)
        expect(dto.name).toBe(item.name)
        expect(dto.code).toBe(item.code)
        expect(dto.sku).toBe(item.sku)
        expect(dto.description).toBe(item.description)
        expect(dto.price).toBe(item.price)
        expect(dto.cost).toBe(item.cost)
        expect(dto.weight).toBe(item.weight)
        expect(dto.spaceId).toBe(item.spaceId)
        expect(dto.spaceType).toBe(item.spaceType)
        expect(dto.status).toBe(item.status)
        expect(dto.notes).toBe(item.notes)
      }),
      { numRuns: 100 },
    )
  })

  it("toDomain creates valid entity from DTO", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        const dto = mapper.toDTO(item)
        const reconstructedItem = mapper.toDomain(dto)

        // The reconstructed item should be a valid Item instance
        expect(reconstructedItem).toBeInstanceOf(Item)

        // Validation should not throw
        expect(() => reconstructedItem.toDTO()).not.toThrow()
      }),
      { numRuns: 100 },
    )
  })

  it("double round trip produces equivalent entity", () => {
    fc.assert(
      fc.property(validItemArb, item => {
        // First round trip
        const dto1 = mapper.toDTO(item)
        const item1 = mapper.toDomain(dto1)

        // Second round trip
        const dto2 = mapper.toDTO(item1)
        const item2 = mapper.toDomain(dto2)

        // Both round trips should produce equivalent entities
        expect(item2.id).toBe(item.id)
        expect(item2.name).toBe(item.name)
        expect(item2.status).toBe(item.status)
        expect(item2.price).toBe(item.price)
        expect(item2.cost).toBe(item.cost)
      }),
      { numRuns: 100 },
    )
  })
})
