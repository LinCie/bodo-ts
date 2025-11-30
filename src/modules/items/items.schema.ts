import { z } from "zod"

// JSON schema for complex fields
const jsonSchema = z
  .union([z.record(z.string(), z.any()), z.array(z.any()), z.any()])
  .nullable()
  .optional()

// Create schema - includes all fields that can be set when creating
const createItemSchema = z.object({
  attributes: jsonSchema,
  code: z.string().nullable().optional(),
  cost: z.coerce.string().optional(),
  description: z.string().nullable().optional(),
  dimension: jsonSchema,
  files: jsonSchema,
  images: jsonSchema,
  links: jsonSchema,
  model_id: z.number().nullable().optional(),
  model_type: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  notes: z.string().nullable().optional(),
  options: jsonSchema,
  parent_id: z.number().nullable().optional(),
  parent_type: z.string().nullable().optional(),
  price: z.coerce.string().optional(),
  primary_code: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  space_id: z.number().nullable().optional(),
  space_type: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  tags: jsonSchema,
  type_id: z.number().nullable().optional(),
  type_type: z.string().nullable().optional(),
  variants: jsonSchema,
  weight: z.coerce.string().optional(),
})

// Update schema - all fields optional
const updateItemSchema = createItemSchema.partial()

const findAllQuerySchema = z.object({
  space_id: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  sort_by: z.enum(["id", "name", "price", "created_at"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  type: z.enum(["commerce", "dashboard"]).optional(),
  with_inventories: z.coerce.boolean().optional(),
})

// Params schema for ID-based routes
const itemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

type FindAllQuery = z.infer<typeof findAllQuerySchema>
type ItemIdParams = z.infer<typeof itemIdParamsSchema>
type CreateItemInput = z.infer<typeof createItemSchema>
type UpdateItemInput = z.infer<typeof updateItemSchema>

export {
  createItemSchema,
  findAllQuerySchema,
  itemIdParamsSchema,
  updateItemSchema,
}
export type { CreateItemInput, FindAllQuery, ItemIdParams, UpdateItemInput }
