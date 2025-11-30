import type { Request, Response } from "express"
import type {
  CreateItemInput,
  FindAllQuery,
  ItemIdParams,
  UpdateItemInput,
} from "./items.schema.js"

import { Controller } from "#infrastructures/base/controller.base.js"
import {
  createItemSchema,
  findAllQuerySchema,
  itemIdParamsSchema,
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
        querySchema: findAllQuerySchema,
      },
      {
        handler: this.show,
        method: "get",
        path: "/:id",
        paramsSchema: itemIdParamsSchema,
      },
      {
        handler: this.create,
        method: "post",
        path: "/",
        schema: createItemSchema,
      },
      {
        handler: this.updateInventory,
        method: "post",
        path: "/:id/inventory",
        paramsSchema: itemIdParamsSchema,
      },
      {
        handler: this.update,
        method: "put",
        path: "/:id",
        schema: updateItemSchema,
        paramsSchema: itemIdParamsSchema,
      },
      {
        handler: this.destroy,
        method: "delete",
        path: "/:id",
        paramsSchema: itemIdParamsSchema,
      },
    ])
  }

  private list = async (req: Request, res: Response) => {
    const query = req.validatedQuery as FindAllQuery
    const items = await this.itemsService.findAll(query)
    res.json(items).send()
  }

  private show = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const item = await this.itemsService.findById(id)
    res.json(item).send()
  }

  private create = async (req: Request, res: Response) => {
    const data = req.validated as CreateItemInput
    const result = await this.itemsService.create(data)
    res.status(201).json(result).send()
  }

  private update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const data = req.validated as UpdateItemInput
    const result = await this.itemsService.update(id, data)
    res.json(result).send()
  }

  private destroy = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    await this.itemsService.delete(id)
    res.status(204).send()
  }

  private updateInventory = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const result = await this.itemsService.updateInventoryToChildren(id)
    res.json(result).send()
  }
}

export { ItemsController }
