import type {
  Content,
  FunctionDeclaration,
  FunctionResponse,
  GenerateContentConfig,
} from "@google/genai"
import type { ItemsService } from "./items.service.js"

import { InternalServerError } from "#core/errors/base.error.js"
import { AI } from "#infrastructures/base/ai.base.js"
import { Type } from "@google/genai"
import { FindAllQuery } from "./items.schema.js"

class ItemsAI extends AI {
  private readonly itemsService: ItemsService

  constructor(itemsService: ItemsService) {
    super()
    this.itemsService = itemsService
  }

  private getItemsFunctionDeclaration: FunctionDeclaration = {
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

  async generate(prompt: string) {
    const contents: Content[] = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ]

    const config: GenerateContentConfig = {
      tools: [{ functionDeclarations: [this.getItemsFunctionDeclaration] }],
    }

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
      config,
    })

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const functionCall of response.functionCalls) {
        if (functionCall.name === "findAll") {
          const args = functionCall.args as FindAllQuery
          const items = await this.itemsService.findAll(args)

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

    const final_response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: contents,
      config: config,
    })

    if (!final_response.text) {
      throw new InternalServerError("Failed to generate content")
    }

    return final_response.text
  }
}

export { ItemsAI }
