import type { User } from "./user.entity.js"

/**
 * Repository interface for User entities.
 * Defines the contract for user data access operations.
 */
interface UserRepository {
  /**
   * Finds a user by their unique identifier.
   * @param id - The user's unique ID
   * @returns The User entity or null if not found
   */
  findById(id: number): Promise<User | null>

  /**
   * Finds a user by their email address.
   * @param email - The user's email address
   * @returns The User entity or null if not found
   */
  findByEmail(email: string): Promise<User | null>

  /**
   * Persists a user entity to the data store.
   * Creates a new user if no ID exists, updates if ID is present.
   * @param user - The User entity to save
   * @returns The saved User entity with generated ID
   */
  save(user: User): Promise<User>
}

export type { UserRepository }
