import type { DB } from "#infrastructures/database/database.js"
import type { Request, Response } from "express"
import type { InsertObject, UpdateObject } from "kysely"

import { NotFoundError } from "#core/errors/base.error.js"
import { Controller } from "#infrastructures/base/controller.base.js"
import {
  type CreateItemInput,
  type UpdateItemInput,
  createItemSchema,
  itemIdParamsSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from "./items.schema.js"
import { ItemsService } from "./items.service.js"

class ItemsController extends Controller {
  private readonly itemsService = new ItemsService()

  constructor() {
    super()
    this.bindRoutes([
      {
        handler: this.list,
        method: "get",
        path: "/",
      },
      {
        handler: this.show,
        method: "get",
        path: "/:id",
      },
      {
        handler: this.create,
        method: "post",
        path: "/",
        schema: createItemSchema,
      },
      {
        handler: this.update,
        method: "put",
        path: "/:id",
        schema: updateItemSchema,
      },
      {
        handler: this.destroy,
        method: "delete",
        path: "/:id",
      },
    ])
  }

  private list = async (req: Request, res: Response) => {
    const query = listItemsQuerySchema.parse(req.query)
    const items = await this.itemsService.findAll({
      spaceId: query.space_id,
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sort_by as
        | "id"
        | "name"
        | "created_at"
        | "updated_at"
        | undefined,
      sortOrder: query.sort_order,
      type: query.type,
    })
    res.json(items)
  }

  private show = async (req: Request, res: Response) => {
    const { id } = itemIdParamsSchema.parse(req.params)
    const item = await this.itemsService.findById(id)

    if (!item) {
      throw new NotFoundError("Item not found")
    }

    res.json(item).send()
  }

  private create = async (req: Request, res: Response) => {
    const data = req.validated as CreateItemInput
    const insertData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      if (
        (key === "cost" || key === "price" || key === "weight") &&
        value !== null
      ) {
        insertData[key] = String(value)
      } else {
        insertData[key] = value === null ? null : value
      }
    }
    const result = await this.itemsService.create(
      insertData as InsertObject<DB, "items">,
    )
    res.status(201).json(result).send()
  }

  private update = async (req: Request, res: Response) => {
    const { id } = itemIdParamsSchema.parse(req.params)
    const data = req.validated as UpdateItemInput

    const item = await this.itemsService.findById(id)
    if (!item) {
      throw new NotFoundError("Item not found")
    }
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      if (
        (key === "cost" || key === "price" || key === "weight") &&
        value !== null
      ) {
        updateData[key] = String(value)
      } else {
        updateData[key] = value === null ? null : value
      }
    }
    const result = await this.itemsService.update(
      id,
      updateData as UpdateObject<DB, "items">,
    )
    res.json(result).send()
  }

  private destroy = async (req: Request, res: Response) => {
    const { id } = itemIdParamsSchema.parse(req.params)

    const item = await this.itemsService.findById(id)
    if (!item) {
      throw new NotFoundError("Item not found")
    }

    await this.itemsService.delete(id)
    res.status(204).send()
  }
}

export { ItemsController }
