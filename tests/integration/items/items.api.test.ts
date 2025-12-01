import type { ItemRepository } from "#domain/items/index.js"
import type { PaginatedResult } from "#domain/shared/index.js"

import {
  CreateItemUseCase,
  DeleteItemUseCase,
  FindAllItemsUseCase,
  FindItemByIdUseCase,
  UpdateItemUseCase,
} from "#application/items/use-cases/index.js"
import { Item } from "#domain/items/index.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Integration tests for Items API endpoints.
 * Tests the use case layer which is the core of the API behavior.
 *
 * **Validates: Requirements 7.1**
 */
describe("Items API Integration Tests", () => {
  // Mock repository for testing
  let mockRepository: ItemRepository
  let createItemUseCase: CreateItemUseCase
  let findItemByIdUseCase: FindItemByIdUseCase
  let findAllItemsUseCase: FindAllItemsUseCase
  let updateItemUseCase: UpdateItemUseCase
  let deleteItemUseCase: DeleteItemUseCase

  // Sample test data
  const sampleItem = Item.create({
    id: 1,
    name: "Test Item",
    code: "TEST-001",
    sku: "SKU-001",
    description: "A test item",
    price: "99.99",
    cost: "50.00",
    weight: "1.5",
    spaceId: 1,
    spaceType: "SPACE",
    status: "active",
    notes: "Test notes",
  })

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findBySpaceId: vi.fn(),
      findByStatus: vi.fn(),
    }

    // Create use cases with mock repository
    createItemUseCase = new CreateItemUseCase(mockRepository)
    findItemByIdUseCase = new FindItemByIdUseCase(mockRepository)
    findAllItemsUseCase = new FindAllItemsUseCase(mockRepository)
    updateItemUseCase = new UpdateItemUseCase(mockRepository)
    deleteItemUseCase = new DeleteItemUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/v1/items - List endpoint", () => {
    it("should return paginated items with success result", async () => {
      const paginatedResult: PaginatedResult<Item> = {
        data: [sampleItem],
        total: 1,
        page: 1,
        limit: 10,
      }

      vi.mocked(mockRepository.findAll).mockResolvedValue(paginatedResult)

      const result = await findAllItemsUseCase.execute({
        filters: { spaceId: 1 },
        page: 1,
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.data).toHaveLength(1)
      expect(result.data?.total).toBe(1)
    })

    it("should handle query parameters correctly", async () => {
      const paginatedResult: PaginatedResult<Item> = {
        data: [],
        total: 0,
        page: 2,
        limit: 20,
      }

      vi.mocked(mockRepository.findAll).mockResolvedValue(paginatedResult)

      const result = await findAllItemsUseCase.execute({
        filters: { spaceId: 1 },
        page: 2,
        limit: 20,
        search: "test",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
      })

      expect(result.success).toBe(true)
      expect(result.data?.page).toBe(2)
      expect(result.data?.limit).toBe(20)
    })

    it("should return empty array when no items found", async () => {
      const emptyResult: PaginatedResult<Item> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      }

      vi.mocked(mockRepository.findAll).mockResolvedValue(emptyResult)

      const result = await findAllItemsUseCase.execute({
        filters: { spaceId: 1 },
      })

      expect(result.success).toBe(true)
      expect(result.data?.data).toHaveLength(0)
      expect(result.data?.total).toBe(0)
    })

    it("should support filtering by status", async () => {
      const paginatedResult: PaginatedResult<Item> = {
        data: [sampleItem],
        total: 1,
        page: 1,
        limit: 10,
      }

      vi.mocked(mockRepository.findAll).mockResolvedValue(paginatedResult)

      const result = await findAllItemsUseCase.execute({
        filters: { spaceId: 1 },
        status: "active",
      })

      expect(result.success).toBe(true)
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active" }),
      )
    })

    it("should support sorting", async () => {
      const paginatedResult: PaginatedResult<Item> = {
        data: [sampleItem],
        total: 1,
        page: 1,
        limit: 10,
      }

      vi.mocked(mockRepository.findAll).mockResolvedValue(paginatedResult)

      const result = await findAllItemsUseCase.execute({
        filters: { spaceId: 1 },
        sortBy: "name",
        sortOrder: "desc",
      })

      expect(result.success).toBe(true)
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "name", sortOrder: "desc" }),
      )
    })
  })

  describe("GET /api/v1/items/:id - Show endpoint", () => {
    it("should return item with success result when found", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)

      const result = await findItemByIdUseCase.execute({ id: 1 })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe("Test Item")
      expect(result.data?.id).toBe(1)
    })

    it("should return ENTITY_NOT_FOUND error when item not found", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await findItemByIdUseCase.execute({ id: 999 })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
    })

    it("should include all item properties in response", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)

      const result = await findItemByIdUseCase.execute({ id: 1 })

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 1,
        name: "Test Item",
        code: "TEST-001",
        sku: "SKU-001",
        description: "A test item",
        price: "99.99",
        cost: "50.00",
        weight: "1.5",
        spaceId: 1,
        status: "active",
      })
    })
  })

  describe("POST /api/v1/items - Create endpoint", () => {
    it("should create item and return success result", async () => {
      vi.mocked(mockRepository.save).mockResolvedValue(sampleItem)

      const result = await createItemUseCase.execute({
        name: "Test Item",
        price: "99.99",
        cost: "50.00",
        status: "active",
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe("Test Item")
    })

    it("should return VALIDATION_ERROR for empty name", async () => {
      const result = await createItemUseCase.execute({
        name: "",
        price: "99.99",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should return VALIDATION_ERROR for whitespace-only name", async () => {
      const result = await createItemUseCase.execute({
        name: "   ",
        price: "99.99",
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should return VALIDATION_ERROR for invalid price format", async () => {
      const result = await createItemUseCase.execute({
        name: "Test Item",
        price: "invalid-price",
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should return VALIDATION_ERROR for invalid cost format", async () => {
      const result = await createItemUseCase.execute({
        name: "Test Item",
        cost: "not-a-number",
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should default status to active when not provided", async () => {
      vi.mocked(mockRepository.save).mockImplementation(
        async (item: Item) => item,
      )

      const result = await createItemUseCase.execute({
        name: "Test Item",
      })

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe("active")
    })
  })

  describe("PUT /api/v1/items/:id - Update endpoint", () => {
    it("should update item and return success result", async () => {
      const updatedItem = Item.create({
        ...sampleItem.toDTO(),
        name: "Updated Item",
      })

      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)
      vi.mocked(mockRepository.update).mockResolvedValue(updatedItem)

      const result = await updateItemUseCase.execute({
        id: 1,
        data: { name: "Updated Item" },
      })

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe("Updated Item")
    })

    it("should return ENTITY_NOT_FOUND when updating non-existent item", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await updateItemUseCase.execute({
        id: 999,
        data: { name: "Updated Item" },
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
    })

    it("should return VALIDATION_ERROR for invalid update data", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)

      const result = await updateItemUseCase.execute({
        id: 1,
        data: { name: "" },
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should allow partial updates", async () => {
      const updatedItem = Item.create({
        ...sampleItem.toDTO(),
        price: "199.99",
      })

      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)
      vi.mocked(mockRepository.update).mockResolvedValue(updatedItem)

      const result = await updateItemUseCase.execute({
        id: 1,
        data: { price: "199.99" },
      })

      expect(result.success).toBe(true)
      expect(result.data?.price).toBe("199.99")
      expect(result.data?.name).toBe("Test Item") // Original name preserved
    })

    it("should allow status change", async () => {
      const updatedItem = Item.create({
        ...sampleItem.toDTO(),
        status: "inactive",
      })

      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)
      vi.mocked(mockRepository.update).mockResolvedValue(updatedItem)

      const result = await updateItemUseCase.execute({
        id: 1,
        data: { status: "inactive" },
      })

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe("inactive")
    })
  })

  describe("DELETE /api/v1/items/:id - Delete endpoint", () => {
    it("should delete (archive) item and return success", async () => {
      const archivedItem = sampleItem.archive()
      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)
      vi.mocked(mockRepository.update).mockResolvedValue(archivedItem)

      const result = await deleteItemUseCase.execute({ id: 1 })

      expect(result.success).toBe(true)
    })

    it("should return ENTITY_NOT_FOUND when deleting non-existent item", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await deleteItemUseCase.execute({ id: 999 })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("ENTITY_NOT_FOUND")
    })

    it("should return BUSINESS_RULE_VIOLATION when item already archived", async () => {
      const archivedItem = Item.create({
        ...sampleItem.toDTO(),
        status: "archived",
      })
      vi.mocked(mockRepository.findById).mockResolvedValue(archivedItem)

      const result = await deleteItemUseCase.execute({ id: 1 })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("BUSINESS_RULE_VIOLATION")
    })
  })

  describe("Response structure consistency", () => {
    it("successful responses contain success: true and data", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)

      const result = await findItemByIdUseCase.execute({ id: 1 })

      expect(result).toHaveProperty("success", true)
      expect(result).toHaveProperty("data")
      expect(result.error).toBeUndefined()
    })

    it("error responses contain success: false and error", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await findItemByIdUseCase.execute({ id: 999 })

      expect(result).toHaveProperty("success", false)
      expect(result).toHaveProperty("error")
      expect(result.data).toBeUndefined()
    })

    it("error responses have code and message properties", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await findItemByIdUseCase.execute({ id: 999 })

      expect(result.error).toHaveProperty("code")
      expect(result.error).toHaveProperty("message")
      expect(typeof result.error?.code).toBe("string")
      expect(typeof result.error?.message).toBe("string")
    })

    it("paginated responses contain pagination metadata", async () => {
      const paginatedResult: PaginatedResult<Item> = {
        data: [sampleItem],
        total: 100,
        page: 5,
        limit: 10,
      }

      vi.mocked(mockRepository.findAll).mockResolvedValue(paginatedResult)

      const result = await findAllItemsUseCase.execute({
        filters: { spaceId: 1 },
        page: 5,
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty("data")
      expect(result.data).toHaveProperty("total", 100)
      expect(result.data).toHaveProperty("page", 5)
      expect(result.data).toHaveProperty("limit", 10)
    })

    it("item DTOs contain all expected fields", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(sampleItem)

      const result = await findItemByIdUseCase.execute({ id: 1 })

      expect(result.success).toBe(true)
      const dto = result.data
      expect(dto).toBeDefined()
      expect(dto).toHaveProperty("id")
      expect(dto).toHaveProperty("name")
      expect(dto).toHaveProperty("status")
      expect(dto).toHaveProperty("code")
      expect(dto).toHaveProperty("sku")
      expect(dto).toHaveProperty("description")
      expect(dto).toHaveProperty("price")
      expect(dto).toHaveProperty("cost")
      expect(dto).toHaveProperty("weight")
      expect(dto).toHaveProperty("spaceId")
    })
  })
})
