import type { Request, Response } from "express"

import type {
  CreateItemDTO,
  UpdateItemDTO,
} from "#application/items/item.dto.js"
import type {
  CreateItemUseCase,
  DeleteItemUseCase,
  FindAllItemsUseCase,
  FindItemByIdUseCase,
  GenerateItemsAIUseCase,
  UpdateInventoryToChildrenUseCase,
  UpdateItemUseCase,
} from "#application/items/use-cases/index.js"
import type { ItemQueryOptions } from "#domain/items/index.js"

import { Controller } from "#presentation/shared/index.js"
import {
  chatPromptSchema,
  createItemSchema,
  findAllQuerySchema,
  itemIdParamsSchema,
  updateItemSchema,
} from "./items.schema.js"

/**
 * Input types from schema validation
 */
interface FindAllQuery {
  space_id: number
  page?: number
  limit?: number
  search?: string
  status?: "active" | "inactive" | "archived"
  sort_by?: "id" | "name" | "price" | "created_at"
  sort_order?: "asc" | "desc"
  type?: "commerce" | "dashboard"
  with_inventories?: boolean
}

interface ItemIdParams {
  id: number
}

interface ChatPromptInput {
  prompt: string
}

interface CreateItemInput {
  name: string
  code?: string | null
  sku?: string | null
  description?: string | null
  price?: string
  cost?: string
  weight?: string
  space_id?: number | null
  space_type?: string | null
  status?: "active" | "inactive" | "archived"
  notes?: string | null
  images?: unknown
  attributes?: unknown
  dimension?: unknown
  files?: unknown
  links?: unknown
  options?: unknown
  tags?: unknown
  variants?: unknown
  primary_code?: string | null
  model_id?: number | null
  model_type?: string | null
  parent_id?: number | null
  parent_type?: string | null
  type_id?: number | null
  type_type?: string | null
}

type UpdateItemInput = Partial<CreateItemInput>

/**
 * Presentation layer controller for Items.
 * Uses use cases for business logic and handles HTTP concerns.
 *
 * **Feature: clean-architecture**
 * **Validates: Requirements 4.1, 4.2, 4.4, 8.1**
 */
class ItemsPresentationController extends Controller {
  constructor(
    private readonly createItemUseCase: CreateItemUseCase,
    private readonly findItemByIdUseCase: FindItemByIdUseCase,
    private readonly findAllItemsUseCase: FindAllItemsUseCase,
    private readonly updateItemUseCase: UpdateItemUseCase,
    private readonly deleteItemUseCase: DeleteItemUseCase,
    private readonly updateInventoryToChildrenUseCase: UpdateInventoryToChildrenUseCase,
    private readonly generateItemsAIUseCase: GenerateItemsAIUseCase,
  ) {
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
      {
        handler: this.generate,
        method: "post",
        path: "/chat",
        schema: chatPromptSchema,
      },
    ])
  }

  /**
   * Lists all items with filtering, pagination, and sorting.
   * Uses FindAllItemsUseCase.
   */
  private list = async (req: Request, res: Response) => {
    const query = req.validatedQuery as FindAllQuery

    // Map schema fields to domain query options
    const queryOptions: ItemQueryOptions = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
      type: query.type,
      withInventories: query.with_inventories,
      filters: {
        spaceId: query.space_id,
      },
    }

    const result = await this.findAllItemsUseCase.execute(queryOptions)
    this.handleResult(res, result)
  }

  /**
   * Shows a single item by ID.
   * Uses FindItemByIdUseCase.
   */
  private show = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const result = await this.findItemByIdUseCase.execute({ id })
    this.handleResult(res, result)
  }

  /**
   * Creates a new item.
   * Uses CreateItemUseCase.
   */
  private create = async (req: Request, res: Response) => {
    const data = req.validated as CreateItemInput

    // Map schema fields to DTO
    const createDto: CreateItemDTO = {
      name: data.name,
      code: data.code,
      sku: data.sku,
      description: data.description,
      price: data.price,
      cost: data.cost,
      weight: data.weight,
      spaceId: data.space_id,
      spaceType: data.space_type,
      status: data.status,
      notes: data.notes,
      images: data.images,
      attributes: data.attributes,
      dimension: data.dimension,
      files: data.files,
      links: data.links,
      options: data.options,
      tags: data.tags,
      variants: data.variants,
      primaryCode: data.primary_code,
      modelId: data.model_id,
      modelType: data.model_type,
      parentId: data.parent_id,
      parentType: data.parent_type,
      typeId: data.type_id,
      typeType: data.type_type,
    }

    const result = await this.createItemUseCase.execute(createDto)
    this.handleResult(res, result, 201)
  }

  /**
   * Updates an existing item.
   * Uses UpdateItemUseCase.
   */
  private update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const data = req.validated as UpdateItemInput

    // Map schema fields to DTO
    const updateDto: UpdateItemDTO = {
      name: data.name,
      code: data.code,
      sku: data.sku,
      description: data.description,
      price: data.price,
      cost: data.cost,
      weight: data.weight,
      spaceId: data.space_id,
      spaceType: data.space_type,
      status: data.status,
      notes: data.notes,
      images: data.images,
      attributes: data.attributes,
      dimension: data.dimension,
      files: data.files,
      links: data.links,
      options: data.options,
      tags: data.tags,
      variants: data.variants,
      primaryCode: data.primary_code,
      modelId: data.model_id,
      modelType: data.model_type,
      parentId: data.parent_id,
      parentType: data.parent_type,
      typeId: data.type_id,
      typeType: data.type_type,
    }

    const result = await this.updateItemUseCase.execute({ id, data: updateDto })
    this.handleResult(res, result)
  }

  /**
   * Deletes an item (soft delete via archive).
   * Uses DeleteItemUseCase.
   */
  private destroy = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const result = await this.deleteItemUseCase.execute({ id })

    if (result.success) {
      res.status(204).send()
    } else if (result.error) {
      this.handleError(res, result.error)
    }
  }

  /**
   * Propagates inventory to child spaces.
   * Uses UpdateInventoryToChildrenUseCase.
   */
  private updateInventory = async (req: Request, res: Response) => {
    const { id } = req.validatedParams as ItemIdParams
    const result = await this.updateInventoryToChildrenUseCase.execute({
      itemId: id,
    })
    this.handleResult(res, result)
  }

  /**
   * Generates AI response for items.
   * Uses GenerateItemsAIUseCase.
   */
  private generate = async (req: Request, res: Response) => {
    const { prompt } = req.validated as ChatPromptInput
    const result = await this.generateItemsAIUseCase.execute({ prompt })

    if (result.success && result.data) {
      res.json(result.data).send()
    } else if (result.error) {
      this.handleError(res, result.error)
    }
  }
}

export { ItemsPresentationController }
