/**
 * Base class for all domain entities.
 * Entities encapsulate business rules and validation logic.
 */
abstract class Entity<T> {
  protected readonly props: T

  protected constructor(props: T) {
    this.props = Object.freeze(props)
  }

  /**
   * Validates the entity state.
   * Should throw ValidationError if validation fails.
   */
  abstract validate(): void

  /**
   * Converts the entity to a Data Transfer Object.
   */
  abstract toDTO(): unknown
}

export { Entity }
