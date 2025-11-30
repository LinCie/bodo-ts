import { env } from "#infrastructures/config/env.config.js"
import { GoogleGenAI } from "@google/genai"

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenAI | undefined
}

globalForGemini.gemini ??= new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
})

export const gemini = globalForGemini.gemini
