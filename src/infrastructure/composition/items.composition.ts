import type { Kysely } from "kysely"

import type { DB } from "#infrastructure/database/index.js"

import {
  CreateItemUseCase,
  DeleteItemUseCase,
  FindAllItemsUseCase,
  FindItemByIdUseCase,
  GenerateItemsAIUseCase,
  UpdateInventoryToChildrenUseCase,
  UpdateItemUseCase,
} from "#application/items/use-cases/index.js"
import { GeminiAIService } from "#infrastructure/ai/index.js"
import { db } from "#infrastructure/database/index.js"
import {
  KyselyInventoryService,
  KyselyItemRepository,
} from "#infrastructure/persistence/index.js"
import { ItemsPresentationController } from "#presentation/items/index.js"

/**
 * Composition root for the Items module.
 * Creates and wires all dependencies for the Items feature.
 *
 * This factory function implements the Composition Root pattern,
 * ensuring all dependencies are composed at the application entry point.
 *
 * **Feature: clean-architecture**
 * **Validates: Requirements 5.1, 5.2, 8.4**
 */
function composeItemsModule(
  database: Kysely<DB> = db,
): ItemsPresentationController {
  // Infrastructure layer - Repository and Services
  const itemRepository = new KyselyItemRepository(database)
  const inventoryService = new KyselyInventoryService(database)
  const aiService = new GeminiAIService()

  // Application layer - Use Cases
  const createItemUseCase = new CreateItemUseCase(itemRepository)
  const findItemByIdUseCase = new FindItemByIdUseCase(itemRepository)
  const findAllItemsUseCase = new FindAllItemsUseCase(itemRepository)
  const updateItemUseCase = new UpdateItemUseCase(itemRepository)
  const deleteItemUseCase = new DeleteItemUseCase(itemRepository)
  const updateInventoryToChildrenUseCase = new UpdateInventoryToChildrenUseCase(
    itemRepository,
    inventoryService,
  )
  const generateItemsAIUseCase = new GenerateItemsAIUseCase(
    itemRepository,
    aiService,
  )

  // Presentation layer - Controller
  const itemsController = new ItemsPresentationController(
    createItemUseCase,
    findItemByIdUseCase,
    findAllItemsUseCase,
    updateItemUseCase,
    deleteItemUseCase,
    updateInventoryToChildrenUseCase,
    generateItemsAIUseCase,
  )

  return itemsController
}

export { composeItemsModule }
