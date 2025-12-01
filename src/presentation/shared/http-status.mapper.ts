import type { DomainError } from "#domain/shared/index.js"

/**
 * Maps domain error codes to HTTP status codes.
 */
const errorStatusMapping: Record<string, number> = {
  ENTITY_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  BUSINESS_RULE_VIOLATION: 422,
  // Auth-specific error mappings
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 404,
  USER_ALREADY_EXISTS: 400,
  INVALID_TOKEN: 401,
  // HTTP-related domain error mappings
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNIQUE_CONSTRAINT: 409,
  INTERNAL_SERVER_ERROR: 500,
}

/**
 * Maps a domain error to an appropriate HTTP status code.
 * Uses Object.hasOwn to prevent prototype pollution attacks.
 */
function mapErrorToHttpStatus(error: DomainError): number {
  if (Object.hasOwn(errorStatusMapping, error.code)) {
    return errorStatusMapping[error.code]
  }
  return 500
}

export { errorStatusMapping, mapErrorToHttpStatus }
