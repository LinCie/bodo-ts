import type { GenerateContentResponse } from "@google/genai"

import type {
  AIGenerateConfig,
  AIService,
} from "#application/shared/ai-service.interface.js"
import { gemini } from "#infrastructure/ai/gemini.js"

/**
 * Gemini-based implementation of the AIService interface.
 * Wraps the Google Generative AI client for content generation.
 *
 * **Feature: clean-architecture**
 * **Validates: Requirements 8.1, 8.2**
 */
class GeminiAIService implements AIService {
  private readonly ai = gemini

  async generateContent(
    config: AIGenerateConfig,
  ): Promise<GenerateContentResponse> {
    return this.ai.models.generateContent({
      model: config.model,
      contents: config.contents,
      config: config.config,
    })
  }
}

export { GeminiAIService }
