/**
 * Abstract base class for all domain errors.
 * Domain errors represent business rule violations and domain-specific failures.
 */
abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Error thrown when entity validation fails.
 */
class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR"

  constructor(public readonly violations: string[]) {
    super(`Validation failed: ${violations.join(", ")}`)
  }
}

/**
 * Error thrown when a requested entity is not found.
 */
class EntityNotFoundError extends DomainError {
  readonly code = "ENTITY_NOT_FOUND"

  constructor(entityName: string, id: number | string) {
    super(`${entityName} with id ${id} not found`)
  }
}

/**
 * Error thrown when a business rule is violated.
 */
class BusinessRuleViolationError extends DomainError {
  readonly code = "BUSINESS_RULE_VIOLATION"
}

/**
 * Error thrown when a request is malformed or contains invalid data.
 */
class BadRequestError extends DomainError {
  readonly code = "BAD_REQUEST"

  constructor(message = "Bad request") {
    super(message)
  }
}

/**
 * Error thrown when authentication is required but not provided or invalid.
 */
class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED"

  constructor(message = "Unauthorized") {
    super(message)
  }
}

/**
 * Error thrown when the user lacks permission to access a resource.
 */
class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN"

  constructor(message = "Forbidden") {
    super(message)
  }
}

/**
 * Error thrown when a requested resource is not found.
 */
class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND"

  constructor(message = "Not found") {
    super(message)
  }
}

/**
 * Error thrown when a unique constraint is violated (e.g., duplicate entry).
 */
class UniqueConstraintError extends DomainError {
  readonly code = "UNIQUE_CONSTRAINT"

  constructor(message = "Unique constraint violation") {
    super(message)
  }
}

/**
 * Error thrown when an internal server error occurs.
 */
class InternalServerError extends DomainError {
  readonly code = "INTERNAL_SERVER_ERROR"

  constructor(message = "Internal server error") {
    super(message)
  }
}

export {
  BadRequestError,
  BusinessRuleViolationError,
  DomainError,
  EntityNotFoundError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  UniqueConstraintError,
  ValidationError,
}
