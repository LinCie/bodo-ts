import type {
  PaginatedResult,
  QueryOptions,
  Repository,
} from "#domain/shared/index.js"
import type { Item, ItemStatus } from "./item.entity.js"

/**
 * Extended query options for Item repository.
 */
interface ItemQueryOptions extends QueryOptions {
  search?: string
  status?: ItemStatus
  withInventories?: boolean
  type?: "commerce" | "dashboard"
}

/**
 * Repository interface for Item entities.
 * Extends the base Repository with Item-specific query methods.
 */
interface ItemRepository extends Repository<Item> {
  /**
   * Finds items by space ID with optional filtering and pagination.
   * @param spaceId - The ID of the space to filter items by
   * @param options - Query options including search, status, pagination
   * @returns Paginated result of items
   */
  findBySpaceId(
    spaceId: number,
    options: ItemQueryOptions,
  ): Promise<PaginatedResult<Item>>

  /**
   * Finds items by status with optional filtering and pagination.
   * @param status - The status to filter by
   * @param options - Query options including pagination and sorting
   * @returns Paginated result of items
   */
  findByStatus(
    status: ItemStatus,
    options: QueryOptions,
  ): Promise<PaginatedResult<Item>>
}

export type { ItemQueryOptions, ItemRepository }
