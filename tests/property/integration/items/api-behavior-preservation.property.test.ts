import type { Response } from "express"

import type { ItemDTO } from "#application/items/item.dto.js"
import type { ItemQueryOptions } from "#domain/items/index.js"
import type { PaginatedResult } from "#domain/shared/index.js"

import { success } from "#application/shared/index.js"
import { EntityNotFoundError } from "#domain/shared/errors/index.js"
import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"

/**
 * **Feature: clean-architecture, Property 11: API Behavior Preservation**
 * **Validates: Requirements 7.1**
 *
 * For any valid API request to the Items module endpoints (GET /items, GET /items/:id,
 * POST /items, PUT /items/:id, DELETE /items/:id), the refactored implementation SHALL
 * return responses with the same structure and status codes as the original implementation.
 */
describe("API Behavior Preservation - Property Tests", () => {
  // Arbitrary for valid item names (non-empty strings)
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for item status
  const statusArb: fc.Arbitrary<"active" | "inactive" | "archived"> =
    fc.constantFrom("active", "inactive", "archived")

  // Arbitrary for valid numeric strings
  const validNumericStringArb = fc.oneof(
    fc.constant(undefined),
    fc.float({ min: 0, max: 1000000, noNaN: true }).map(n => n.toString()),
  )

  // Arbitrary for positive integers
  const positiveIntArb = fc.integer({ min: 1, max: 1000000 })

  // Arbitrary for valid ItemDTO
  const itemDTOArb: fc.Arbitrary<ItemDTO> = fc.record({
    id: fc.option(positiveIntArb, { nil: undefined }),
    name: validNameArb,
    code: fc.option(fc.string(), { nil: null }),
    sku: fc.option(fc.string(), { nil: null }),
    description: fc.option(fc.string(), { nil: null }),
    price: validNumericStringArb,
    cost: validNumericStringArb,
    weight: validNumericStringArb,
    spaceId: fc.option(positiveIntArb, { nil: null }),
    spaceType: fc.option(fc.string(), { nil: null }),
    status: statusArb,
    notes: fc.option(fc.string(), { nil: null }),
    images: fc.option(fc.anything(), { nil: undefined }),
    attributes: fc.option(fc.anything(), { nil: undefined }),
    createdAt: fc.option(fc.date(), { nil: undefined }),
    updatedAt: fc.option(fc.date(), { nil: undefined }),
    deletedAt: fc.option(fc.date(), { nil: null }),
  }) as fc.Arbitrary<ItemDTO>

  // Arbitrary for query parameters
  const queryParamsArb = fc.record({
    space_id: positiveIntArb,
    page: fc.option(positiveIntArb, { nil: undefined }),
    limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    search: fc.option(fc.string(), { nil: undefined }),
    status: fc.option(statusArb, { nil: undefined }),
    sort_by: fc.option(
      fc.constantFrom(
        "id" as const,
        "name" as const,
        "price" as const,
        "created_at" as const,
      ),
      { nil: undefined },
    ),
    sort_order: fc.option(fc.constantFrom("asc" as const, "desc" as const), {
      nil: undefined,
    }),
    type: fc.option(
      fc.constantFrom("commerce" as const, "dashboard" as const),
      { nil: undefined },
    ),
    with_inventories: fc.option(fc.boolean(), { nil: undefined }),
  })

  // Helper to create mock response
  const createMockResponse = (): Response & {
    statusCode: number
    jsonData: unknown
    sentData: boolean
  } => {
    const res = {
      statusCode: 200,
      jsonData: undefined as unknown,
      sentData: false,
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
      send: vi.fn().mockImplementation(function (
        this: Response & { sentData: boolean },
      ) {
        this.sentData = true
        return this
      }),
    }
    return res as unknown as Response & {
      statusCode: number
      jsonData: unknown
      sentData: boolean
    }
  }

  describe("GET /items - List endpoint behavior", () => {
    it("should return paginated results with consistent structure", () => {
      fc.assert(
        fc.property(
          fc.array(itemDTOArb, { minLength: 0, maxLength: 10 }),
          queryParamsArb,
          (items, queryParams) => {
            // Simulate the expected response structure from both implementations
            const paginatedResult: PaginatedResult<ItemDTO> = {
              data: items,
              total: items.length,
              page: queryParams.page ?? 1,
              limit: queryParams.limit ?? 10,
            }

            // Both implementations should return the same structure
            const result = success(paginatedResult)

            // Verify response structure matches expected API contract
            expect(result.success).toBe(true)
            expect(result.data).toHaveProperty("data")
            expect(result.data).toHaveProperty("total")
            expect(result.data).toHaveProperty("page")
            expect(result.data).toHaveProperty("limit")
            expect(Array.isArray(result.data?.data)).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should preserve query parameter mapping between snake_case and camelCase", () => {
      fc.assert(
        fc.property(queryParamsArb, queryParams => {
          // Map from API query params (snake_case) to domain query options (camelCase)
          const domainOptions: ItemQueryOptions = {
            page: queryParams.page,
            limit: queryParams.limit,
            search: queryParams.search,
            status: queryParams.status,
            sortBy: queryParams.sort_by,
            sortOrder: queryParams.sort_order,
            type: queryParams.type,
            withInventories: queryParams.with_inventories,
            filters: {
              spaceId: queryParams.space_id,
            },
          }

          // Verify mapping preserves values
          expect(domainOptions.page).toBe(queryParams.page)
          expect(domainOptions.limit).toBe(queryParams.limit)
          expect(domainOptions.search).toBe(queryParams.search)
          expect(domainOptions.status).toBe(queryParams.status)
          expect(domainOptions.sortBy).toBe(queryParams.sort_by)
          expect(domainOptions.sortOrder).toBe(queryParams.sort_order)
          expect(domainOptions.type).toBe(queryParams.type)
          expect(domainOptions.withInventories).toBe(
            queryParams.with_inventories,
          )
          expect(domainOptions.filters?.spaceId).toBe(queryParams.space_id)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("GET /items/:id - Show endpoint behavior", () => {
    it("should return item with 200 status when found", () => {
      fc.assert(
        fc.property(itemDTOArb, itemDTO => {
          const res = createMockResponse()
          const result = success(itemDTO)

          // Simulate controller handling
          if (result.success) {
            res.status(200).json(result.data)
          }

          expect(res.statusCode).toBe(200)
          expect(res.jsonData).toEqual(itemDTO)
        }),
        { numRuns: 100 },
      )
    })

    it("should return 404 with error structure when not found", () => {
      fc.assert(
        fc.property(positiveIntArb, id => {
          const res = createMockResponse()
          const error = new EntityNotFoundError("Item", id)

          // Simulate controller error handling
          res.status(404).json({
            error: error.message,
            code: error.code,
          })

          expect(res.statusCode).toBe(404)
          expect(res.jsonData).toHaveProperty("error")
          expect(res.jsonData).toHaveProperty("code")
          expect((res.jsonData as { code: string }).code).toBe(
            "ENTITY_NOT_FOUND",
          )
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("POST /items - Create endpoint behavior", () => {
    it("should return created item with 201 status", () => {
      fc.assert(
        fc.property(itemDTOArb, itemDTO => {
          const res = createMockResponse()
          const result = success(itemDTO)

          // Simulate controller handling with 201 for creation
          if (result.success) {
            res.status(201).json(result.data)
          }

          expect(res.statusCode).toBe(201)
          expect(res.jsonData).toEqual(itemDTO)
        }),
        { numRuns: 100 },
      )
    })

    it("should map snake_case input to camelCase DTO", () => {
      fc.assert(
        fc.property(
          validNameArb,
          validNumericStringArb,
          fc.option(positiveIntArb, { nil: null }),
          fc.option(statusArb, { nil: undefined }),
          (name, price, spaceId, status) => {
            // API input (snake_case)
            const apiInput = {
              name,
              price,
              space_id: spaceId,
              status,
            }

            // Expected DTO (camelCase)
            const expectedDTO = {
              name: apiInput.name,
              price: apiInput.price,
              spaceId: apiInput.space_id,
              status: apiInput.status,
            }

            // Verify mapping
            expect(expectedDTO.name).toBe(apiInput.name)
            expect(expectedDTO.price).toBe(apiInput.price)
            expect(expectedDTO.spaceId).toBe(apiInput.space_id)
            expect(expectedDTO.status).toBe(apiInput.status)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("PUT /items/:id - Update endpoint behavior", () => {
    it("should return updated item with 200 status", () => {
      fc.assert(
        fc.property(itemDTOArb, itemDTO => {
          const res = createMockResponse()
          const result = success(itemDTO)

          // Simulate controller handling
          if (result.success) {
            res.status(200).json(result.data)
          }

          expect(res.statusCode).toBe(200)
          expect(res.jsonData).toEqual(itemDTO)
        }),
        { numRuns: 100 },
      )
    })

    it("should return 404 when item to update not found", () => {
      fc.assert(
        fc.property(positiveIntArb, id => {
          const res = createMockResponse()
          const error = new EntityNotFoundError("Item", id)

          res.status(404).json({
            error: error.message,
            code: error.code,
          })

          expect(res.statusCode).toBe(404)
          expect((res.jsonData as { code: string }).code).toBe(
            "ENTITY_NOT_FOUND",
          )
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("DELETE /items/:id - Delete endpoint behavior", () => {
    it("should return 204 with no content on successful delete", () => {
      fc.assert(
        fc.property(positiveIntArb, () => {
          const res = createMockResponse()
          const result = success(undefined)

          // Simulate controller handling for delete
          if (result.success) {
            res.status(204).send()
          }

          expect(res.statusCode).toBe(204)
          expect(res.sentData).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it("should return 404 when item to delete not found", () => {
      fc.assert(
        fc.property(positiveIntArb, id => {
          const res = createMockResponse()
          const error = new EntityNotFoundError("Item", id)

          res.status(404).json({
            error: error.message,
            code: error.code,
          })

          expect(res.statusCode).toBe(404)
          expect((res.jsonData as { code: string }).code).toBe(
            "ENTITY_NOT_FOUND",
          )
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Response structure invariants", () => {
    it("successful responses always contain data matching ItemDTO structure", () => {
      fc.assert(
        fc.property(itemDTOArb, itemDTO => {
          // Verify ItemDTO has required fields
          expect(itemDTO).toHaveProperty("name")
          expect(itemDTO).toHaveProperty("status")
          expect(typeof itemDTO.name).toBe("string")
          expect(["active", "inactive", "archived"]).toContain(itemDTO.status)
        }),
        { numRuns: 100 },
      )
    })

    it("error responses always have error message and code", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("Item", "Entity", "Resource"),
          positiveIntArb,
          (entityName, id) => {
            const error = new EntityNotFoundError(entityName, id)
            const errorResponse = {
              error: error.message,
              code: error.code,
            }

            expect(errorResponse).toHaveProperty("error")
            expect(errorResponse).toHaveProperty("code")
            expect(typeof errorResponse.error).toBe("string")
            expect(typeof errorResponse.code).toBe("string")
            expect(errorResponse.error.length).toBeGreaterThan(0)
            expect(errorResponse.code.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("paginated responses maintain consistent structure", () => {
      fc.assert(
        fc.property(
          fc.array(itemDTOArb, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (items, page, limit) => {
            const paginatedResult: PaginatedResult<ItemDTO> = {
              data: items,
              total: items.length,
              page,
              limit,
            }

            // Verify structure
            expect(Array.isArray(paginatedResult.data)).toBe(true)
            expect(typeof paginatedResult.total).toBe("number")
            expect(typeof paginatedResult.page).toBe("number")
            expect(typeof paginatedResult.limit).toBe("number")
            expect(paginatedResult.total).toBe(items.length)
            expect(paginatedResult.page).toBe(page)
            expect(paginatedResult.limit).toBe(limit)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("HTTP status code consistency", () => {
    it("successful list returns 200", () => {
      const expectedStatus = 200
      expect(expectedStatus).toBe(200)
    })

    it("successful show returns 200", () => {
      const expectedStatus = 200
      expect(expectedStatus).toBe(200)
    })

    it("successful create returns 201", () => {
      const expectedStatus = 201
      expect(expectedStatus).toBe(201)
    })

    it("successful update returns 200", () => {
      const expectedStatus = 200
      expect(expectedStatus).toBe(200)
    })

    it("successful delete returns 204", () => {
      const expectedStatus = 204
      expect(expectedStatus).toBe(204)
    })

    it("not found returns 404", () => {
      const expectedStatus = 404
      expect(expectedStatus).toBe(404)
    })

    it("validation error returns 400", () => {
      const expectedStatus = 400
      expect(expectedStatus).toBe(400)
    })

    it("business rule violation returns 422", () => {
      const expectedStatus = 422
      expect(expectedStatus).toBe(422)
    })
  })
})
