import type { Mapper } from "#application/shared/index.js"
import { Item } from "#domain/items/index.js"
import type { ItemDTO } from "./item.dto.js"

/**
 * Mapper for converting between Item entity and ItemDTO.
 */
class ItemMapper implements Mapper<Item, ItemDTO> {
  /**
   * Converts an Item entity to an ItemDTO.
   */
  toDTO(domain: Item): ItemDTO {
    return domain.toDTO()
  }

  /**
   * Converts an ItemDTO to an Item entity.
   */
  toDomain(dto: ItemDTO): Item {
    return Item.create({
      id: dto.id,
      name: dto.name,
      code: dto.code,
      sku: dto.sku,
      description: dto.description,
      price: dto.price,
      cost: dto.cost,
      weight: dto.weight,
      spaceId: dto.spaceId,
      spaceType: dto.spaceType,
      status: dto.status,
      notes: dto.notes,
      images: dto.images,
      attributes: dto.attributes,
      dimension: dto.dimension,
      files: dto.files,
      links: dto.links,
      options: dto.options,
      tags: dto.tags,
      variants: dto.variants,
      primaryCode: dto.primaryCode,
      modelId: dto.modelId,
      modelType: dto.modelType,
      parentId: dto.parentId,
      parentType: dto.parentType,
      typeId: dto.typeId,
      typeType: dto.typeType,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      deletedAt: dto.deletedAt,
    })
  }
}

export { ItemMapper }
