import type { Entity } from "./entity.base.js"

/**
 * Query options for repository methods.
 */
interface QueryOptions {
  page?: number
  limit?: number
  filters?: Record<string, unknown>
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

/**
 * Paginated result wrapper for repository queries.
 */
interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

/**
 * Base repository interface for domain entities.
 * Defines standard CRUD and query operations.
 */
interface Repository<T extends Entity<unknown>> {
  findById(id: number): Promise<T | null>
  findAll(query: QueryOptions): Promise<PaginatedResult<T>>
  save(entity: T): Promise<T>
  update(id: number, entity: Partial<T>): Promise<T>
  delete(id: number): Promise<void>
}

export type { PaginatedResult, QueryOptions, Repository }
