import type { Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import {
  DomainError,
  EntityNotFoundError,
} from "#domain/shared/errors/index.js"

/**
 * Input for DeleteItemUseCase.
 */
interface DeleteItemInput {
  id: number
}

/**
 * Use case for deleting an Item (soft delete via archive).
 *
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.1, 2.3**
 */
class DeleteItemUseCase implements UseCase<DeleteItemInput, void> {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: DeleteItemInput): Promise<Result<void>> {
    try {
      // First check if the entity exists
      const existingItem = await this.itemRepository.findById(input.id)

      if (!existingItem) {
        return failure(new EntityNotFoundError("Item", input.id))
      }

      // Perform soft delete by archiving the item
      const archivedItem = existingItem.archive()

      // Persist the archived entity
      await this.itemRepository.update(input.id, archivedItem)

      return success(undefined)
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { DeleteItemUseCase }
export type { DeleteItemInput }
