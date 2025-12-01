import type { Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemQueryOptions, ItemRepository } from "#domain/items/index.js"
import { DomainError } from "#domain/shared/errors/index.js"
import type { PaginatedResult } from "#domain/shared/index.js"
import type { ItemDTO } from "../item.dto.js"

/**
 * Paginated result of ItemDTOs.
 */
interface PaginatedItemResult {
  data: ItemDTO[]
  total: number
  page: number
  limit: number
}

/**
 * Use case for finding all Items with filtering, pagination, and sorting.
 *
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.1, 2.3, 3.4**
 */
class FindAllItemsUseCase
  implements UseCase<ItemQueryOptions, PaginatedItemResult>
{
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: ItemQueryOptions): Promise<Result<PaginatedItemResult>> {
    try {
      const result: PaginatedResult<unknown> =
        await this.itemRepository.findAll(input)

      const dtoResult: PaginatedItemResult = {
        data: result.data.map(item => {
          const entity = item as { toDTO: () => ItemDTO }
          return entity.toDTO()
        }),
        total: result.total,
        page: result.page,
        limit: result.limit,
      }

      return success(dtoResult)
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { FindAllItemsUseCase }
export type { PaginatedItemResult }
