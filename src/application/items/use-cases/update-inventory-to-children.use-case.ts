import type { Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import {
  DomainError,
  EntityNotFoundError,
} from "#domain/shared/errors/index.js"

/**
 * Input for UpdateInventoryToChildrenUseCase.
 */
interface UpdateInventoryToChildrenInput {
  itemId: number
}

/**
 * Output for UpdateInventoryToChildrenUseCase.
 */
interface UpdateInventoryToChildrenOutput {
  updatedCount: number
}

/**
 * Service interface for inventory operations.
 * This abstracts the infrastructure-level inventory operations.
 */
interface InventoryService {
  getSpaceChildrenIds(spaceId: number): Promise<number[]>
  getExistingInventorySpaceIds(
    itemId: number,
    spaceIds: number[],
  ): Promise<number[]>
  createInventories(
    inventories: {
      itemId: number
      itemType: string
      spaceId: number
      spaceType: string
      name: string
      code?: string | null
      sku?: string | null
      costPerUnit?: string
      status: string
      notes?: string | null
    }[],
  ): Promise<number>
}

/**
 * Use case for propagating an item's inventory to all child spaces.
 * Creates new inventory records in child spaces if they don't exist.
 *
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.1, 2.3**
 */
class UpdateInventoryToChildrenUseCase
  implements
    UseCase<UpdateInventoryToChildrenInput, UpdateInventoryToChildrenOutput>
{
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly inventoryService: InventoryService,
  ) {}

  async execute(
    input: UpdateInventoryToChildrenInput,
  ): Promise<Result<UpdateInventoryToChildrenOutput>> {
    try {
      // Find the item
      const item = await this.itemRepository.findById(input.itemId)

      if (!item) {
        return failure(new EntityNotFoundError("Item", input.itemId))
      }

      // If item has no space, nothing to propagate
      if (!item.spaceId) {
        return success({ updatedCount: 0 })
      }

      // Get all child spaces in the hierarchy
      const childrenIds = await this.inventoryService.getSpaceChildrenIds(
        item.spaceId,
      )

      if (childrenIds.length === 0) {
        return success({ updatedCount: 0 })
      }

      // Check which child spaces already have inventory for this item
      const existingSpaceIds =
        await this.inventoryService.getExistingInventorySpaceIds(
          input.itemId,
          childrenIds,
        )

      const existingSpaceIdSet = new Set(existingSpaceIds)

      // Prepare new inventory records for spaces that don't have one yet
      const newInventories: {
        itemId: number
        itemType: string
        spaceId: number
        spaceType: string
        name: string
        code?: string | null
        sku?: string | null
        costPerUnit?: string
        status: string
        notes?: string | null
      }[] = []

      const itemId = item.id
      if (itemId === undefined) {
        return success({ updatedCount: 0 })
      }

      for (const spaceId of childrenIds) {
        if (!existingSpaceIdSet.has(spaceId)) {
          newInventories.push({
            itemId: itemId,
            itemType: "ITM",
            spaceId: spaceId,
            spaceType: item.spaceType ?? "SPACE",
            name: item.name,
            code: item.code,
            sku: item.sku,
            costPerUnit: item.cost,
            status: item.status,
            notes: item.notes,
          })
        }
      }

      // Create new inventories
      let updatedCount = 0
      if (newInventories.length > 0) {
        updatedCount =
          await this.inventoryService.createInventories(newInventories)
      }

      return success({ updatedCount })
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { UpdateInventoryToChildrenUseCase }
export type {
  InventoryService,
  UpdateInventoryToChildrenInput,
  UpdateInventoryToChildrenOutput,
}
