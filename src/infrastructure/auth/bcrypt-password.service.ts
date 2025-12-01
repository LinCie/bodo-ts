import bcrypt from "bcrypt"

import type { PasswordService } from "#domain/auth/index.js"

const BCRYPT_ROUNDS = 12

/**
 * Bcrypt-based implementation of the PasswordService interface.
 * Handles password hashing and verification with Laravel-compatible format.
 */
class BcryptPasswordService implements PasswordService {
  /**
   * Hashes a plain text password using bcrypt.
   * Converts the hash to Laravel-compatible $2y$ format.
   * @param password - The plain text password to hash
   * @returns A promise resolving to the hashed password in Laravel format
   */
  async hash(password: string): Promise<string> {
    const nodeHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    // Convert Node.js bcrypt format ($2b$) to Laravel-compatible format ($2y$)
    return nodeHash.replace(/^\$2[ab]\$/, "$2y$")
  }

  /**
   * Verifies a plain text password against a hash.
   * Handles Laravel $2y$ format by converting to Node.js $2b$ format.
   * @param password - The plain text password to verify
   * @param hash - The hashed password to compare against
   * @returns A promise resolving to true if password matches, false otherwise
   */
  async verify(password: string, hash: string): Promise<boolean> {
    // Convert Laravel format ($2y$) to Node.js bcrypt format ($2b$)
    const nodeCompatibleHash = hash.replace(/^\$2y\$/, "$2b$")
    return bcrypt.compare(password, nodeCompatibleHash)
  }
}

export { BcryptPasswordService }
