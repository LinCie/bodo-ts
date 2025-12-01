import type {
  Content,
  FunctionDeclaration,
  FunctionResponse,
} from "@google/genai"

import type { AIService, Result, UseCase } from "#application/shared/index.js"
import { failure, success } from "#application/shared/index.js"
import type { ItemQueryOptions, ItemRepository } from "#domain/items/index.js"
import { DomainError, ValidationError } from "#domain/shared/errors/index.js"
import { Type } from "@google/genai"

/**
 * Input for AI generation use case.
 */
interface GenerateItemsAIInput {
  prompt: string
}

/**
 * Query parameters for finding items (matches schema from presentation layer).
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

/**
 * Use case for generating AI responses about items.
 * Uses the ItemRepository for data access instead of legacy service.
 *
 * **Feature: clean-architecture**
 * **Validates: Requirements 8.1, 8.2**
 */
class GenerateItemsAIUseCase implements UseCase<GenerateItemsAIInput, string> {
  private readonly getItemsFunctionDeclaration: FunctionDeclaration = {
    name: "findAll",
    description: "Get a list of items for a given space ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        space_id: {
          type: Type.NUMBER,
          description: "The ID of the space to get items for",
        },
        page: {
          type: Type.NUMBER,
          description: "The page number to retrieve",
        },
        limit: {
          type: Type.NUMBER,
          description: "The number of items per page",
        },
        status: {
          type: Type.STRING,
          description:
            "The status of the items to filter by, e.g., 'active', 'inactive', 'archived'",
        },
        sort_by: {
          type: Type.STRING,
          description:
            "The field to sort by (e.g., 'id', 'name', 'price', 'created_at')",
        },
        order_by: {
          type: Type.STRING,
          description: "The sort order ('asc' or 'desc')",
        },
        search: {
          type: Type.STRING,
          description: "The search term to filter items by name",
        },
        with_inventories: {
          type: Type.BOOLEAN,
          description:
            "Whether to include associated inventories in the response",
        },
      },
      required: ["space_id"],
    },
  }

  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly aiService: AIService,
  ) {}

  async execute(input: GenerateItemsAIInput): Promise<Result<string>> {
    try {
      if (!input.prompt || input.prompt.trim().length === 0) {
        return failure(new ValidationError(["Prompt is required"]))
      }

      const contents: Content[] = [
        {
          role: "user",
          parts: [{ text: input.prompt }],
        },
      ]

      const response = await this.aiService.generateContent({
        model: "gemini-2.5-flash-lite",
        contents,
        config: {
          tools: [{ functionDeclarations: [this.getItemsFunctionDeclaration] }],
        },
      })

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const functionCall of response.functionCalls) {
          if (functionCall.name === "findAll") {
            const args = functionCall.args as unknown as FindAllQuery

            // Use repository instead of legacy service
            const queryOptions: ItemQueryOptions = {
              page: args.page,
              limit: args.limit,
              search: args.search,
              status: args.status,
              sortBy: args.sort_by,
              sortOrder: args.sort_order,
              type: args.type,
              withInventories: args.with_inventories,
              filters: {
                spaceId: args.space_id,
              },
            }

            const result = await this.itemRepository.findBySpaceId(
              args.space_id,
              queryOptions,
            )

            const items = result.data.map(item => item.toDTO())

            const functionResponse: FunctionResponse = {
              name: functionCall.name,
              response: { items },
            }

            if (response.candidates?.[0]?.content) {
              contents.push(response.candidates[0].content)
              contents.push({
                role: "user",
                parts: [{ functionResponse }],
              })
            }
          }
        }
      }

      const finalResponse = await this.aiService.generateContent({
        model: "gemini-2.5-flash-lite",
        contents,
        config: {
          tools: [{ functionDeclarations: [this.getItemsFunctionDeclaration] }],
        },
      })

      if (!finalResponse.text) {
        return failure(new ValidationError(["Failed to generate content"]))
      }

      return success(finalResponse.text)
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}

export { GenerateItemsAIUseCase }
export type { GenerateItemsAIInput }
