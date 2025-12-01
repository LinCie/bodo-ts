import type { Insertable } from "kysely"

import type { DB, Inventories } from "#infrastructure/database/index.js"
import type { Kysely } from "kysely"

import type { InventoryService } from "#application/items/use-cases/index.js"
import { db } from "#infrastructure/database/index.js"

/**
 * Kysely-based implementation of the InventoryService interface.
 * Handles inventory-related database operations for use cases.
 *
 * **Feature: clean-architecture**
 * **Validates: Requirements 3.1, 5.2**
 */
class KyselyInventoryService implements InventoryService {
  constructor(private readonly database: Kysely<DB> = db) {}

  /**
   * Recursively fetches all child space IDs for a given space using a CTE.
   */
  async getSpaceChildrenIds(spaceId: number): Promise<number[]> {
    const result = await this.database
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
   * Gets existing inventory space IDs for an item.
   */
  async getExistingInventorySpaceIds(
    itemId: number,
    spaceIds: number[],
  ): Promise<number[]> {
    if (spaceIds.length === 0) {
      return []
    }

    const existingInventories = await this.database
      .selectFrom("inventories")
      .select("space_id")
      .where("item_id", "=", itemId)
      .where("space_id", "in", spaceIds)
      .execute()

    return existingInventories
      .map(i => i.space_id)
      .filter((id): id is number => id !== null)
  }

  /**
   * Creates multiple inventory records.
   */
  async createInventories(
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
  ): Promise<number> {
    if (inventories.length === 0) {
      return 0
    }

    const records: Insertable<Inventories>[] = inventories.map(inv => ({
      item_id: inv.itemId,
      item_type: inv.itemType,
      space_id: inv.spaceId,
      space_type: inv.spaceType,
      name: inv.name,
      code: inv.code,
      sku: inv.sku,
      cost_per_unit: inv.costPerUnit,
      status: inv.status,
      notes: inv.notes,
      model_type: "SUP",
      parent_type: "IVT",
      created_at: new Date(),
      updated_at: new Date(),
    }))

    await this.database.insertInto("inventories").values(records).execute()

    return inventories.length
  }
}

export { KyselyInventoryService }
