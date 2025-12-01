import type { Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemRepository } from "#domain/items/index.js"
import { Item } from "#domain/items/index.js"
import { DomainError } from "#domain/shared/errors/index.js"
import type { CreateItemDTO, ItemDTO } from "../item.dto.js"

/**
 * Use case for creating a new Item.
 * Accepts CreateItemDTO and returns Result<ItemDTO>.
 *
 * **Feature: clean-architecture, Property 4: Use Case Result Format**
 * **Validates: Requirements 2.1, 2.3, 2.4**
 */
class CreateItemUseCase implements UseCase<CreateItemDTO, ItemDTO> {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: CreateItemDTO): Promise<Result<ItemDTO>> {
    try {
      const item = Item.create({
        name: input.name,
        code: input.code,
        sku: input.sku,
        description: input.description,
        price: input.price,
        cost: input.cost,
        weight: input.weight,
        spaceId: input.spaceId,
        spaceType: input.spaceType,
        status: input.status ?? "active",
        notes: input.notes,
        images: input.images,
        attributes: input.attributes,
        dimension: input.dimension,
        files: input.files,
        links: input.links,
        options: input.options,
        tags: input.tags,
        variants: input.variants,
        primaryCode: input.primaryCode,
        modelId: input.modelId,
        modelType: input.modelType,
        parentId: input.parentId,
        parentType: input.parentType,
        typeId: input.typeId,
        typeType: input.typeType,
      })

      const saved = await this.itemRepository.save(item)
      return success(saved.toDTO() as ItemDTO)
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { CreateItemUseCase }
