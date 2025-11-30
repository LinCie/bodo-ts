import { gemini } from "#infrastructures/ai/gemini.js"

abstract class AI {
  protected readonly ai = gemini
}

export { AI }
