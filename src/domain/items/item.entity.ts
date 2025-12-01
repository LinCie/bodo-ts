import { Entity } from "#domain/shared/entity.base.js"
import {
  BusinessRuleViolationError,
  ValidationError,
} from "#domain/shared/errors/index.js"

/**
 * Item status types
 */
type ItemStatus = "active" | "inactive" | "archived"

/**
 * Properties for the Item entity
 */
interface ItemProps {
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
 * Item entity representing a product or inventory item.
 * Encapsulates business rules and validation logic.
 */
class Item extends Entity<ItemProps> {
  private constructor(props: ItemProps) {
    super(props)
    this.validate()
  }

  /**
   * Factory method to create a new Item entity.
   */
  static create(
    props: Omit<ItemProps, "status"> & { status?: ItemStatus },
  ): Item {
    return new Item({
      ...props,
      status: props.status ?? "active",
    })
  }

  /**
   * Validates the entity state.
   * Throws ValidationError if validation fails.
   */
  validate(): void {
    const violations: string[] = []

    // Name is required and must not be empty
    if (!this.props.name || this.props.name.trim().length === 0) {
      violations.push("Name is required")
    }

    // Price must be a valid number if provided
    if (this.props.price !== undefined && this.props.price !== "") {
      const priceNum = parseFloat(this.props.price)
      if (isNaN(priceNum)) {
        violations.push("Price must be a valid number")
      }
    }

    // Cost must be a valid number if provided
    if (this.props.cost !== undefined && this.props.cost !== "") {
      const costNum = parseFloat(this.props.cost)
      if (isNaN(costNum)) {
        violations.push("Cost must be a valid number")
      }
    }

    // Weight must be a valid number if provided
    if (this.props.weight !== undefined && this.props.weight !== "") {
      const weightNum = parseFloat(this.props.weight)
      if (isNaN(weightNum)) {
        violations.push("Weight must be a valid number")
      }
    }

    if (violations.length > 0) {
      throw new ValidationError(violations)
    }
  }

  // Getters for encapsulation
  get id(): number | undefined {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get code(): string | null | undefined {
    return this.props.code
  }

  get sku(): string | null | undefined {
    return this.props.sku
  }

  get description(): string | null | undefined {
    return this.props.description
  }

  get price(): string | undefined {
    return this.props.price
  }

  get cost(): string | undefined {
    return this.props.cost
  }

  get weight(): string | undefined {
    return this.props.weight
  }

  get spaceId(): number | null | undefined {
    return this.props.spaceId
  }

  get spaceType(): string | null | undefined {
    return this.props.spaceType
  }

  get status(): ItemStatus {
    return this.props.status
  }

  get notes(): string | null | undefined {
    return this.props.notes
  }

  get images(): unknown {
    return this.props.images
  }

  get attributes(): unknown {
    return this.props.attributes
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt
  }

  get deletedAt(): Date | null | undefined {
    return this.props.deletedAt
  }

  /**
   * Archives the item (soft delete).
   * Throws BusinessRuleViolationError if already archived.
   */
  archive(): Item {
    if (this.props.status === "archived") {
      throw new BusinessRuleViolationError("Item is already archived")
    }
    return Item.create({
      ...this.props,
      status: "archived",
      deletedAt: new Date(),
    })
  }

  /**
   * Restores an archived item.
   * Throws BusinessRuleViolationError if not archived.
   */
  restore(): Item {
    if (this.props.status !== "archived") {
      throw new BusinessRuleViolationError("Item is not archived")
    }
    return Item.create({
      ...this.props,
      status: "active",
      deletedAt: null,
    })
  }

  /**
   * Updates the item with new properties.
   * Returns a new Item instance with updated values.
   */
  update(updates: Partial<Omit<ItemProps, "id" | "createdAt">>): Item {
    return Item.create({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    })
  }

  /**
   * Converts the entity to a Data Transfer Object.
   */
  toDTO(): ItemProps {
    return { ...this.props }
  }
}

export { Item }
export type { ItemProps, ItemStatus }
