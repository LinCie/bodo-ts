import { z } from "zod"

// JSON schema for complex fields
const jsonSchema = z
  .union([z.record(z.string(), z.any()), z.array(z.any()), z.any()])
  .nullable()
  .optional()

// Decimal schema (stored as string in DB, can be number or string in input)
// Note: Generated fields may have defaults, so we allow undefined but handle null
const decimalSchema = z.union([z.number(), z.string()]).optional()

// Create schema - includes all fields that can be set when creating
export const createItemSchema = z.object({
  attributes: jsonSchema,
  code: z.string().nullable().optional(),
  cost: decimalSchema,
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
  price: decimalSchema,
  primary_code: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  space_id: z.number().nullable().optional(),
  space_type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  tags: jsonSchema,
  type_id: z.number().nullable().optional(),
  type_type: z.string().nullable().optional(),
  variants: jsonSchema,
  weight: decimalSchema,
})

// Update schema - all fields optional
export const updateItemSchema = createItemSchema.partial()

// Query schema for list endpoint
export const listItemsQuerySchema = z.object({
  space_id: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  type: z.enum(["commerce", "dashboard"]).optional(),
})

// Params schema for ID-based routes
export const itemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>
export type ItemIdParams = z.infer<typeof itemIdParamsSchema>
