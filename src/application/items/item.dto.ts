import type { ItemStatus } from "#domain/items/index.js"

/**
 * Data Transfer Object for Item entity.
 * Used for transferring item data between layers.
 */
interface ItemDTO {
  id?: number
  name: string
  code?: string | null
  sku?: string | null
  description?: string | null
  price?: string
  cost?: string
  weight?: string
  spaceId?: number | null
  spaceType?: string | null
  status: ItemStatus
  notes?: string | null
  images?: unknown
  attributes?: unknown
  dimension?: unknown
  files?: unknown
  links?: unknown
  options?: unknown
  tags?: unknown
  variants?: unknown
  primaryCode?: string | null
  modelId?: number | null
  modelType?: string | null
  parentId?: number | null
  parentType?: string | null
  typeId?: number | null
  typeType?: string | null
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

/**
 * Input DTO for creating a new Item.
 */
interface CreateItemDTO {
  name: string
  code?: string | null
  sku?: string | null
  description?: string | null
  price?: string
  cost?: string
  weight?: string
  spaceId?: number | null
  spaceType?: string | null
  status?: ItemStatus
  notes?: string | null
  images?: unknown
  attributes?: unknown
  dimension?: unknown
  files?: unknown
  links?: unknown
  options?: unknown
  tags?: unknown
  variants?: unknown
  primaryCode?: string | null
  modelId?: number | null
  modelType?: string | null
  parentId?: number | null
  parentType?: string | null
  typeId?: number | null
  typeType?: string | null
}

/**
 * Input DTO for updating an existing Item.
 */
type UpdateItemDTO = Partial<CreateItemDTO>

export type { CreateItemDTO, ItemDTO, UpdateItemDTO }
