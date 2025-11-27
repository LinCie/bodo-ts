import type { DB, Items } from "#infrastructures/database/database.js"
import type {
  InsertObject,
  OrderByDirection,
  OrderByExpression,
  UpdateObject,
} from "kysely"

import { Service } from "#infrastructures/base/service.base.js"

class ItemsService extends Service {
  findAll(options: {
    spaceId: number
    page?: number
    limit?: number
    search?: string
    status?: "active" | "inactive" | "archived"
    sortBy?: OrderByExpression<DB, "items", Items>
    sortOrder?: OrderByDirection
  }) {
    const {
      spaceId,
      page = 1,
      limit = 10,
      search,
      status = "active",
      sortBy,
      sortOrder,
    } = options
    const query = this.db
      .selectFrom("items")
      .selectAll()
      .where("space_id", "=", spaceId)
      .where("status", "=", status)
    if (search) {
      const searches = search.split(" ")
      for (const search of searches) {
        query.where("name", "like", `%${search}%`)
      }
    }
    if (sortBy && sortOrder) {
      query.orderBy(sortBy, sortOrder)
    }
    if (page && limit) {
      query.limit(limit).offset((page - 1) * limit)
    }
    return query.execute()
  }

  findById(id: number) {
    return this.db
      .selectFrom("items")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst()
  }

  create(data: InsertObject<DB, "items">) {
    return this.db
      .insertInto("items")
      .values({ ...data, created_at: new Date(), updated_at: new Date() })
      .execute()
  }

  update(id: number, data: UpdateObject<DB, "items">) {
    return this.db
      .updateTable("items")
      .where("id", "=", id)
      .set({ ...data, updated_at: new Date() })
      .execute()
  }

  delete(id: number) {
    return this.db
      .updateTable("items")
      .where("id", "=", id)
      .set({ deleted_at: new Date(), status: "archived" })
      .execute()
  }

  restore(id: number) {
    return this.db
      .updateTable("items")
      .where("id", "=", id)
      .set({ deleted_at: null })
      .execute()
  }

  forceDelete(id: number) {
    return this.db.deleteFrom("items").where("id", "=", id).execute()
  }
}

export { ItemsService }
