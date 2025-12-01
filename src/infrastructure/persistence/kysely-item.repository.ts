import type { Insertable, Selectable, Updateable } from "kysely"

import type { DB, Items } from "#infrastructure/database/index.js"
import type { Kysely } from "kysely"

import { Item, type ItemProps, type ItemStatus } from "#domain/items/index.js"
import type {
  ItemQueryOptions,
  ItemRepository,
} from "#domain/items/item.repository.interface.js"
import {
  EntityNotFoundError,
  ValidationError,
} from "#domain/shared/errors/index.js"
import type { PaginatedResult, QueryOptions } from "#domain/shared/index.js"
import { db } from "#infrastructure/database/index.js"
import { jsonArrayFrom } from "kysely/helpers/mysql"

type ItemRecord = Selectable<Items>

/**
 * Kysely-based implementation of the ItemRepository interface.
 * Handles persistence operations for Item entities using MySQL database.
 */
class KyselyItemRepository implements ItemRepository {
  constructor(private readonly database: Kysely<DB> = db) {}

  /**
   * Converts a database record to a domain Item entity.
   */
  toDomain(record: ItemRecord): Item {
    return Item.create({
      id: record.id,
      name: record.name,
      code: record.code,
      sku: record.sku,
      description: record.description,
      price: record.price,
      cost: record.cost,
      weight: record.weight,
      spaceId: record.space_id,
      spaceType: record.space_type,
      status: record.status as ItemStatus,
      notes: record.notes,
      images: record.images,
      attributes: record.attributes,
      dimension: record.dimension,
      files: record.files,
      links: record.links,
      options: record.options,
      tags: record.tags,
      variants: record.variants,
      primaryCode: record.primary_code,
      modelId: record.model_id,
      modelType: record.model_type,
      parentId: record.parent_id,
      parentType: record.parent_type,
      typeId: record.type_id,
      typeType: record.type_type,
      createdAt: record.created_at ?? undefined,
      updatedAt: record.updated_at ?? undefined,
      deletedAt: record.deleted_at,
    })
  }

  /**
   * Converts a domain Item entity to a database record for persistence.
   */
  toPersistence(entity: Item): Insertable<Items> {
    const dto = entity.toDTO()
    return {
      name: dto.name,
      code: dto.code,
      sku: dto.sku,
      description: dto.description,
      price: dto.price ? parseFloat(dto.price) : undefined,
      cost: dto.cost ? parseFloat(dto.cost) : undefined,
      weight: dto.weight ? parseFloat(dto.weight) : undefined,
      space_id: dto.spaceId,
      space_type: dto.spaceType,
      status: dto.status,
      notes: dto.notes,
      images: dto.images ? JSON.stringify(dto.images) : null,
      attributes: dto.attributes ? JSON.stringify(dto.attributes) : null,
      dimension: dto.dimension ? JSON.stringify(dto.dimension) : null,
      files: dto.files ? JSON.stringify(dto.files) : null,
      links: dto.links ? JSON.stringify(dto.links) : null,
      options: dto.options ? JSON.stringify(dto.options) : null,
      tags: dto.tags ? JSON.stringify(dto.tags) : null,
      variants: dto.variants ? JSON.stringify(dto.variants) : null,
      primary_code: dto.primaryCode,
      model_id: dto.modelId,
      model_type: dto.modelType,
      parent_id: dto.parentId,
      parent_type: dto.parentType,
      type_id: dto.typeId,
      type_type: dto.typeType,
      created_at: dto.createdAt ?? new Date(),
      updated_at: dto.updatedAt ?? new Date(),
      deleted_at: dto.deletedAt,
    }
  }

  /**
   * Converts partial entity updates to database update format.
   */
  private toUpdatePersistence(updates: Partial<ItemProps>): Updateable<Items> {
    const result: Updateable<Items> = {
      updated_at: new Date(),
    }

    if (updates.name !== undefined) result.name = updates.name
    if (updates.code !== undefined) result.code = updates.code
    if (updates.sku !== undefined) result.sku = updates.sku
    if (updates.description !== undefined)
      result.description = updates.description
    if (updates.price !== undefined)
      result.price =
        updates.price !== "" ? String(parseFloat(updates.price)) : "0"
    if (updates.cost !== undefined)
      result.cost = updates.cost !== "" ? String(parseFloat(updates.cost)) : "0"
    if (updates.weight !== undefined)
      result.weight =
        updates.weight !== "" ? String(parseFloat(updates.weight)) : "0"
    if (updates.spaceId !== undefined) result.space_id = updates.spaceId
    if (updates.spaceType !== undefined) result.space_type = updates.spaceType
    if (updates.status !== undefined) result.status = updates.status
    if (updates.notes !== undefined) result.notes = updates.notes
    if (updates.images !== undefined)
      result.images = updates.images ? JSON.stringify(updates.images) : null
    if (updates.attributes !== undefined)
      result.attributes = updates.attributes
        ? JSON.stringify(updates.attributes)
        : null
    if (updates.deletedAt !== undefined) result.deleted_at = updates.deletedAt

    return result
  }

  /**
   * Finds an item by its ID.
   */
  async findById(id: number): Promise<Item | null> {
    const record = await this.database
      .selectFrom("items")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst()

    if (!record) {
      return null
    }

    return this.toDomain(record)
  }

  /**
   * Finds all items with pagination and optional filtering.
   */
  async findAll(query: QueryOptions): Promise<PaginatedResult<Item>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit

    let baseQuery = this.database.selectFrom("items")

    // Apply filters
    if (query.filters) {
      if (query.filters.status) {
        baseQuery = baseQuery.where(
          "status",
          "=",
          query.filters.status as string,
        )
      }
      if (query.filters.spaceId) {
        baseQuery = baseQuery.where(
          "space_id",
          "=",
          query.filters.spaceId as number,
        )
      }
    }

    // Get total count
    const countResult = await baseQuery
      .select(eb => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst()
    const total = countResult?.count ?? 0

    // Apply sorting
    let dataQuery = baseQuery.selectAll()
    if (query.sortBy) {
      const sortColumn = this.mapSortColumn(query.sortBy)
      dataQuery = dataQuery.orderBy(sortColumn, query.sortOrder ?? "asc")
    } else {
      dataQuery = dataQuery.orderBy("id", "asc")
    }

    // Apply pagination
    const records = await dataQuery.limit(limit).offset(offset).execute()

    return {
      data: records.map(record => this.toDomain(record)),
      total,
      page,
      limit,
    }
  }

  /**
   * Saves a new item to the database.
   */
  async save(entity: Item): Promise<Item> {
    const data = this.toPersistence(entity)

    const result = await this.database
      .insertInto("items")
      .values(data)
      .executeTakeFirst()

    const insertedId = result.insertId

    const saved = await this.findById(Number(insertedId))
    if (!saved) {
      throw new ValidationError(["Failed to save item"])
    }

    return saved
  }

  /**
   * Updates an existing item.
   */
  async update(id: number, entity: Partial<Item>): Promise<Item> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new EntityNotFoundError("Item", id)
    }

    // Extract the properties to update from the partial entity
    const updates: Partial<ItemProps> = {}
    if ("name" in entity && entity.name !== undefined)
      updates.name = entity.name
    if ("code" in entity) updates.code = entity.code
    if ("sku" in entity) updates.sku = entity.sku
    if ("description" in entity) updates.description = entity.description
    if ("price" in entity) updates.price = entity.price
    if ("cost" in entity) updates.cost = entity.cost
    if ("weight" in entity) updates.weight = entity.weight
    if ("status" in entity) updates.status = entity.status
    if ("notes" in entity) updates.notes = entity.notes

    const updateData = this.toUpdatePersistence(updates)

    await this.database
      .updateTable("items")
      .where("id", "=", id)
      .set(updateData)
      .execute()

    const updated = await this.findById(id)
    if (!updated) {
      throw new EntityNotFoundError("Item", id)
    }

    return updated
  }

  /**
   * Soft deletes an item by setting status to archived.
   */
  async delete(id: number): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new EntityNotFoundError("Item", id)
    }

    await this.database
      .updateTable("items")
      .where("id", "=", id)
      .set({
        status: "archived",
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .execute()
  }

  /**
   * Finds items by space ID with optional filtering and pagination.
   */
  async findBySpaceId(
    spaceId: number,
    options: ItemQueryOptions,
  ): Promise<PaginatedResult<Item>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 10
    const offset = (page - 1) * limit

    // Get space and its parent to include items from the parent space
    const space = await this.database
      .selectFrom("spaces")
      .select("parent_id")
      .where("id", "=", spaceId)
      .executeTakeFirst()

    const spaceIds = [spaceId]
    if (space?.parent_id) {
      spaceIds.push(space.parent_id)
    }

    let baseQuery = this.database
      .selectFrom("items")
      .where("space_id", "in", spaceIds)

    // Apply status filter
    if (options.status) {
      baseQuery = baseQuery.where("status", "=", options.status)
    } else {
      baseQuery = baseQuery.where("status", "=", "active")
    }

    // Apply search filter
    if (options.search) {
      const searchTerm = `%${options.search}%`
      baseQuery = baseQuery.where(eb =>
        eb.or([
          eb("name", "like", searchTerm),
          eb("code", "like", searchTerm),
          eb("sku", "like", searchTerm),
          eb("notes", "like", searchTerm),
        ]),
      )
    }

    // Get total count
    const countResult = await baseQuery
      .select(eb => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst()
    const total = countResult?.count ?? 0

    // Build data query with sorting
    let dataQuery = baseQuery.selectAll()

    // Include inventory data if requested
    if (options.withInventories) {
      dataQuery = dataQuery.select(eb => [
        jsonArrayFrom(
          eb
            .selectFrom("inventories")
            .select(["space_id", "balance", "notes", "status", "cost_per_unit"])
            .whereRef("inventories.item_id", "=", "items.id"),
        ).as("inventories"),
      ])
    }

    // Apply sorting
    if (options.sortBy) {
      const sortColumn = this.mapSortColumn(options.sortBy)
      dataQuery = dataQuery.orderBy(sortColumn, options.sortOrder ?? "asc")
    } else {
      dataQuery = dataQuery.orderBy("id", "asc")
    }

    // Apply pagination
    const records = await dataQuery.limit(limit).offset(offset).execute()

    return {
      data: records.map(record => this.toDomain(record)),
      total,
      page,
      limit,
    }
  }

  /**
   * Finds items by status with optional filtering and pagination.
   */
  async findByStatus(
    status: ItemStatus,
    options: QueryOptions,
  ): Promise<PaginatedResult<Item>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 10
    const offset = (page - 1) * limit

    let baseQuery = this.database
      .selectFrom("items")
      .where("status", "=", status)

    // Apply additional filters
    if (options.filters) {
      if (options.filters.spaceId) {
        baseQuery = baseQuery.where(
          "space_id",
          "=",
          options.filters.spaceId as number,
        )
      }
    }

    // Get total count
    const countResult = await baseQuery
      .select(eb => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst()
    const total = countResult?.count ?? 0

    // Build data query with sorting
    let dataQuery = baseQuery.selectAll()

    if (options.sortBy) {
      const sortColumn = this.mapSortColumn(options.sortBy)
      dataQuery = dataQuery.orderBy(sortColumn, options.sortOrder ?? "asc")
    } else {
      dataQuery = dataQuery.orderBy("id", "asc")
    }

    // Apply pagination
    const records = await dataQuery.limit(limit).offset(offset).execute()

    return {
      data: records.map(record => this.toDomain(record)),
      total,
      page,
      limit,
    }
  }

  /**
   * Maps domain sort column names to database column names.
   */
  private mapSortColumn(sortBy: string): keyof Items {
    const mapping: Record<string, keyof Items> = {
      id: "id",
      name: "name",
      code: "code",
      sku: "sku",
      price: "price",
      cost: "cost",
      status: "status",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
    return mapping[sortBy] ?? "id"
  }
}

export { KyselyItemRepository }
