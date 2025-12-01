import { DomainError } from "#domain/shared/errors/index.js"

/**
 * Error thrown when user credentials are invalid (wrong password).
 */
class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS"

  constructor() {
    super("Invalid email or password")
  }
}

/**
 * Error thrown when a user is not found.
 */
class UserNotFoundError extends DomainError {
  readonly code = "USER_NOT_FOUND"

  constructor(identifier: string | number) {
    super(`User with id ${identifier} not found`)
  }
}

/**
 * Error thrown when attempting to create a user with an existing email.
 */
class UserAlreadyExistsError extends DomainError {
  readonly code = "USER_ALREADY_EXISTS"

  constructor(email: string) {
    super(`User with email ${email} already exists`)
  }
}

/**
 * Error thrown when a token is invalid or expired.
 */
class InvalidTokenError extends DomainError {
  readonly code = "INVALID_TOKEN"

  constructor(message = "Invalid or expired token") {
    super(message)
  }
}

export {
  InvalidCredentialsError,
  InvalidTokenError,
  UserAlreadyExistsError,
  UserNotFoundError,
}
