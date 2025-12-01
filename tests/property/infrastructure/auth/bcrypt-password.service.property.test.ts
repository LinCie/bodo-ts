import { BcryptPasswordService } from "#infrastructure/auth/bcrypt-password.service.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

// Bcrypt is intentionally slow for security, so we need longer timeouts
const BCRYPT_TEST_TIMEOUT = 60000

/**
 * **Feature: auth-clean-architecture, Property 2: Password Verification Correctness**
 * **Validates: Requirements 1.3**
 *
 * For any password string, hashing the password and then verifying with the same
 * password SHALL return true, and verifying with a different password SHALL return false.
 */
describe("BcryptPasswordService - Property Tests", () => {
  const passwordService = new BcryptPasswordService()

  // Arbitrary for valid passwords (non-empty strings)
  const validPasswordArb = fc.string({ minLength: 1, maxLength: 72 }) // bcrypt max is 72 bytes

  // Arbitrary for different passwords (two distinct non-empty strings)
  const differentPasswordsArb = fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 72 }),
      fc.string({ minLength: 1, maxLength: 72 }),
    )
    .filter(([a, b]) => a !== b)

  it(
    "should verify correctly with the same password (round-trip)",
    async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async password => {
          const hash = await passwordService.hash(password)
          const isValid = await passwordService.verify(password, hash)
          expect(isValid).toBe(true)
        }),
        { numRuns: 10 }, // Reduced runs due to bcrypt being slow
      )
    },
    BCRYPT_TEST_TIMEOUT,
  )

  it(
    "should fail verification with a different password",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          differentPasswordsArb,
          async ([password, wrongPassword]) => {
            const hash = await passwordService.hash(password)
            const isValid = await passwordService.verify(wrongPassword, hash)
            expect(isValid).toBe(false)
          },
        ),
        { numRuns: 10 }, // Reduced runs due to bcrypt being slow
      )
    },
    BCRYPT_TEST_TIMEOUT,
  )

  it(
    "should produce Laravel-compatible hash format ($2y$)",
    async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async password => {
          const hash = await passwordService.hash(password)
          expect(hash).toMatch(/^\$2y\$/)
        }),
        { numRuns: 10 },
      )
    },
    BCRYPT_TEST_TIMEOUT,
  )

  it(
    "should verify passwords hashed in Laravel format ($2y$)",
    async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async password => {
          // Hash produces Laravel format
          const laravelHash = await passwordService.hash(password)
          expect(laravelHash.startsWith("$2y$")).toBe(true)

          // Verification should work with Laravel format
          const isValid = await passwordService.verify(password, laravelHash)
          expect(isValid).toBe(true)
        }),
        { numRuns: 10 },
      )
    },
    BCRYPT_TEST_TIMEOUT,
  )
})
