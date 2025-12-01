import type { Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import {
  DomainError,
  EntityNotFoundError,
} from "#domain/shared/errors/index.js"
import type { ItemDTO, UpdateItemDTO } from "../item.dto.js"

/**
 * Input for UpdateItemUseCase.
 */
interface UpdateItemInput {
  id: number
  data: UpdateItemDTO
}

/**
 * Use case for updating an existing Item.
 * Validates entity exists before update.
 *
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.1, 2.3**
 */
class UpdateItemUseCase implements UseCase<UpdateItemInput, ItemDTO> {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: UpdateItemInput): Promise<Result<ItemDTO>> {
    try {
      // First check if the entity exists
      const existingItem = await this.itemRepository.findById(input.id)

      if (!existingItem) {
        return failure(new EntityNotFoundError("Item", input.id))
      }

      // Update the entity using the domain method
      const updatedItem = existingItem.update(input.data)

      // Persist the updated entity
      const saved = await this.itemRepository.update(input.id, updatedItem)

      return success(saved.toDTO() as ItemDTO)
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { UpdateItemUseCase }
export type { UpdateItemInput }
