import type { Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import {
  DomainError,
  EntityNotFoundError,
} from "#domain/shared/errors/index.js"
import type { ItemDTO } from "../item.dto.js"

/**
 * Input for FindItemByIdUseCase.
 */
interface FindItemByIdInput {
  id: number
}

/**
 * Use case for finding an Item by ID.
 * Returns failure with EntityNotFoundError if not found.
 *
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.1, 2.3**
 */
class FindItemByIdUseCase implements UseCase<FindItemByIdInput, ItemDTO> {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: FindItemByIdInput): Promise<Result<ItemDTO>> {
    try {
      const item = await this.itemRepository.findById(input.id)

      if (!item) {
        return failure(new EntityNotFoundError("Item", input.id))
      }

      return success(item.toDTO() as ItemDTO)
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { FindItemByIdUseCase }
export type { FindItemByIdInput }
