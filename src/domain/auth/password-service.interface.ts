/**
 * Service interface for password hashing and verification.
 * Defines the contract for secure password operations.
 */
interface PasswordService {
  /**
   * Hashes a plain text password.
   * @param password - The plain text password to hash
   * @returns A promise resolving to the hashed password
   */
  hash(password: string): Promise<string>

  /**
   * Verifies a plain text password against a hash.
   * @param password - The plain text password to verify
   * @param hash - The hashed password to compare against
   * @returns A promise resolving to true if password matches, false otherwise
   */
  verify(password: string, hash: string): Promise<boolean>
}

export type { PasswordService }
