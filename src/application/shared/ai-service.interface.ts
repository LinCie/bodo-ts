import type {
  Content,
  FunctionDeclaration,
  GenerateContentConfig,
  GenerateContentResponse,
} from "@google/genai"

/**
 * Configuration for AI content generation.
 */
interface AIGenerateConfig {
  model: string
  contents: Content[]
  config?: GenerateContentConfig
}

/**
 * Interface for AI service abstraction.
 * Defines the contract for AI content generation that can be implemented
 * by different AI providers (Gemini, OpenAI, etc.).
 *
 * **Feature: clean-architecture**
 * **Validates: Requirements 8.1, 8.2**
 */
interface AIService {
  /**
   * Generates content using the AI model.
   */
  generateContent(config: AIGenerateConfig): Promise<GenerateContentResponse>
}

/**
 * Helper to create function declaration tools for AI.
 */
interface AIFunctionTool {
  functionDeclarations: FunctionDeclaration[]
}

export type { AIFunctionTool, AIGenerateConfig, AIService }
