import { Entity } from "#domain/shared/entity.base.js"
import { ValidationError } from "#domain/shared/errors/index.js"

/**
 * Properties for the User entity
 */
interface UserProps {
  id?: number
  name: string
  email: string
  password: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Data Transfer Object for User (excludes password for security)
 */
interface UserDTO {
  id: number
  name: string
  email: string
}

/**
 * User entity representing an authenticated user.
 * Encapsulates business rules and validation logic.
 */
class User extends Entity<UserProps> {
  private constructor(props: UserProps) {
    super(props)
    this.validate()
  }

  /**
   * Factory method to create a new User entity.
   */
  static create(props: UserProps): User {
    return new User(props)
  }

  /**
   * Validates the entity state.
   * Throws ValidationError if validation fails.
   */
  validate(): void {
    const violations: string[] = []

    // Name is required and must not be empty
    if (!this.props.name || this.props.name.trim().length === 0) {
      violations.push("Name is required")
    }

    // Email is required and must be valid format
    if (!this.props.email || !this.isValidEmail(this.props.email)) {
      violations.push("Valid email is required")
    }

    // Password must be at least 8 characters
    if (!this.props.password || this.props.password.length < 8) {
      violations.push("Password must be at least 8 characters")
    }

    if (violations.length > 0) {
      throw new ValidationError(violations)
    }
  }

  /**
   * Validates email format using regex
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Getters for encapsulation
  get id(): number | undefined {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get email(): string {
    return this.props.email
  }

  get password(): string {
    return this.props.password
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt
  }

  /**
   * Converts the entity to a Data Transfer Object.
   * Excludes password for security.
   */
  toDTO(): UserDTO {
    if (this.props.id === undefined) {
      throw new Error("Cannot convert unsaved User to DTO")
    }
    return {
      id: this.props.id,
      name: this.props.name,
      email: this.props.email,
    }
  }
}

export { User }
export type { UserDTO, UserProps }
