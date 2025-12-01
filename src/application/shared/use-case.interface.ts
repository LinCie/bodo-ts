import type { Result } from "./result.js"

/**
 * Base interface for all use cases.
 * Use cases encapsulate application-specific business rules.
 */
interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput>>
}

export type { UseCase }
