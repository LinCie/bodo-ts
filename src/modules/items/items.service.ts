import type { Inventories, Items } from "#infrastructures/database/database.js"
import type { Insertable, Updateable } from "kysely"

import { NotFoundError } from "#core/errors/base.error.js"
import { Service } from "#infrastructures/base/service.base.js"
import { jsonArrayFrom } from "kysely/helpers/mysql"
import { FindAllQuery } from "./items.schema.js"

class ItemsService extends Service {
  /**
   * Retrieves a paginated list of items based on provided filters.
   * Supports searching, sorting, and fetching associated inventories.
   *
   * @param options - The filtering and pagination options
   * @param options.spaceId - The ID of the space to filter items by
   * @param options.page - The page number for pagination (default: 1)
   * @param options.limit - The number of items per page (default: 10)
   * @param options.search - Optional search term for filtering by name, code, sku, or notes
   * @param options.status - Filter by item status (active, inactive, archived) (default: "active")
   * @param options.sortBy - Field to sort by
   * @param options.sortOrder - Sort direction (asc, desc)
   * @param options.type - context type for the query (commerce vs dashboard)
   * @param options.withInventories - Whether to include associated inventory data
   * @returns Promise resolving to an array of items
   */
  async findAll({
    space_id,
    page = 1,
    limit = 10,
    search,
    status = "active",
    sort_by = "id",
    sort_order = "asc",
    type = "dashboard",
    with_inventories = false,
  }: FindAllQuery) {
    // Get space and its parent to include items from the parent space if applicable
    const space = await this.db
      .selectFrom("spaces")
      .select("parent_id")
      .where("id", "=", space_id)
      .executeTakeFirst()

    const spaceIds = [space_id]
    if (space?.parent_id) {
      spaceIds.push(space.parent_id)
    }

    // Start building the query
    let query = this.db
      .selectFrom("items")
      .where("space_id", "in", spaceIds)
      .where("status", "=", status)
      .orderBy(sort_by, sort_order)
      .limit(limit)
      .offset((page - 1) * limit)

    // Apply search filter if provided
    if (search) {
      query = query.where(eb =>
        eb.or([
          eb("name", "like", `%${search}%`),
          eb("code", "like", `%${search}%`),
          eb("sku", "like", `%${search}%`),
          eb("notes", "like", `%${search}%`),
        ]),
      )
    }

    // Select columns based on context (commerce vs dashboard)
    // Commerce view needs fewer fields compared to the dashboard
    if (type === "commerce") {
      query = query.select(["name", "description", "price", "weight", "images"])
    } else {
      query = query.selectAll()
    }

    // Include inventory data using a subquery if requested
    if (with_inventories) {
      query = query.select(eb => [
        jsonArrayFrom(
          eb
            .selectFrom("inventories")
            .select(["space_id", "balance", "notes", "status", "cost_per_unit"])
            .whereRef("inventories.item_id", "=", "items.id"),
        ).as("inventories"),
      ])
    }

    return query.execute()
  }

  /**
   * Retrieves a single item by its ID.
   *
   * @param id - The ID of the item to retrieve
   * @returns Promise resolving to the item or undefined if not found
   */
  async findById(id: number) {
    const item = await this.db
      .selectFrom("items")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst()

    if (!item) {
      throw new NotFoundError("Item not found")
    }

    return item
  }

  /**
   * Creates a new item in the database.
   * Automatically sets created_at and updated_at timestamps.
   *
   * @param data - The item data to insert
   * @returns Promise resolving to the insertion result
   */
  create(data: Insertable<Items>) {
    return this.db
      .insertInto("items")
      .values({ ...data, created_at: new Date(), updated_at: new Date() })
      .execute()
  }

  /**
   * Updates an existing item.
   * Automatically updates the updated_at timestamp.
   *
   * @param id - The ID of the item to update
   * @param data - The data to update
   * @returns Promise resolving to the update result
   */
  update(id: number, data: Updateable<Items>) {
    return this.db
      .updateTable("items")
      .where("id", "=", id)
      .set({ ...data, updated_at: new Date() })
      .execute()
  }

  /**
   * Soft deletes an item by setting its status to 'archived' and setting deleted_at.
   *
   * @param id - The ID of the item to delete
   * @returns Promise resolving to the update result
   */
  delete(id: number) {
    return this.db
      .updateTable("items")
      .where("id", "=", id)
      .set({ deleted_at: new Date(), status: "archived" })
      .execute()
  }

  /**
   * Restores a soft-deleted item.
   *
   * @param id - The ID of the item to restore
   * @returns Promise resolving to the update result
   */
  restore(id: number) {
    return this.db
      .updateTable("items")
      .where("id", "=", id)
      .set({ deleted_at: null })
      .execute()
  }

  /**
   * Permanently removes an item from the database.
   *
   * @param id - The ID of the item to force delete
   * @returns Promise resolving to the delete result
   */
  forceDelete(id: number) {
    return this.db.deleteFrom("items").where("id", "=", id).execute()
  }

  /**
   * Recursively fetches all child space IDs for a given space using a Common Table Expression (CTE).
   * Used to identify all downstream spaces that should receive inventory updates.
   *
   * @param spaceId - Parent space ID to fetch children for
   * @returns Promise resolving to an array of child space IDs
   */
  private async getSpaceChildrenIds(spaceId: number): Promise<number[]> {
    const result = await this.db
      .withRecursive("space_tree", db =>
        db
          .selectFrom("spaces")
          .select("id")
          .where("id", "=", spaceId)
          .unionAll(
            db
              .selectFrom("spaces")
              .select("spaces.id")
              .innerJoin("space_tree", "space_tree.id", "spaces.parent_id"),
          ),
      )
      .selectFrom("space_tree")
      .select("id")
      .where("id", "!=", spaceId)
      .execute()

    return result.map(r => r.id)
  }

  /**
   * Propagates an item's inventory to all child spaces of its parent space.
   * Creates new inventory records in child spaces if they don't exist.
   *
   * @param itemId - ID of the item to propagate inventory for
   * @returns Object containing the count of created inventory records
   */
  async updateInventoryToChildren(itemId: number) {
    const item = await this.findById(itemId)
    if (!item.space_id) return { updatedCount: 0 }

    // Get all child spaces in the hierarchy
    const childrenIds = await this.getSpaceChildrenIds(item.space_id)

    if (childrenIds.length === 0) return { updatedCount: 0 }

    // Check which child spaces already have inventory for this item
    const existingInventories = await this.db
      .selectFrom("inventories")
      .select("space_id")
      .where("item_id", "=", itemId)
      .where("space_id", "in", childrenIds)
      .execute()

    const existingSpaceIds = new Set(
      existingInventories
        .map(i => i.space_id)
        .filter((id): id is number => id !== null),
    )
    const newInventories: Insertable<Inventories>[] = []

    // Prepare new inventory records for spaces that don't have one yet
    for (const spaceId of childrenIds) {
      if (!existingSpaceIds.has(spaceId)) {
        newInventories.push({
          item_id: item.id,
          item_type: "ITM",
          space_id: spaceId,
          space_type: item.space_type ?? "SPACE",
          name: item.name,
          code: item.code,
          sku: item.sku,
          cost_per_unit: item.cost,
          status: item.status,
          notes: item.notes,
          model_type: "SUP",
          parent_type: "IVT",
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }

    // Bulk insert new inventories
    if (newInventories.length > 0) {
      await this.db.insertInto("inventories").values(newInventories).execute()
    }

    return { updatedCount: newInventories.length }
  }
}

export { ItemsService }
