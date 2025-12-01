import type { DomainError } from "#domain/shared/index.js"

/**
 * Result type for use case operations.
 * Represents either a successful result with data or a failure with an error.
 */
interface Result<T> {
  success: boolean
  data?: T
  error?: DomainError
}

/**
 * Creates a successful result with the given data.
 */
function success<T>(data: T): Result<T> {
  return { success: true, data }
}

/**
 * Creates a failure result with the given error.
 */
function failure<T>(error: DomainError): Result<T> {
  return { success: false, error }
}

export { failure, success }
export type { Result }
