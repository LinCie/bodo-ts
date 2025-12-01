import { User, UserDTO } from "#domain/auth/user.entity.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 3: User Entity-DTO Round Trip**
 * **Validates: Requirements 1.4**
 *
 * For any valid User entity, converting to UserDTO and back to User entity
 * SHALL produce an entity with equivalent property values (excluding password for security).
 */
describe("User Entity-DTO Round Trip - Property Tests", () => {
  // Arbitrary for valid names (non-empty strings with at least one non-whitespace char)
  const validNameArb = fc
    .string({ minLength: 1 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for valid emails
  const validEmailArb = fc
    .tuple(
      fc
        .string({ minLength: 1 })
        .filter(s => !s.includes("@") && !s.includes(" ") && s.length > 0),
      fc
        .string({ minLength: 1 })
        .filter(
          s =>
            !s.includes("@") &&
            !s.includes(" ") &&
            !s.includes(".") &&
            s.length > 0,
        ),
      fc
        .string({ minLength: 1 })
        .filter(
          s =>
            !s.includes("@") &&
            !s.includes(" ") &&
            !s.includes(".") &&
            s.length > 0,
        ),
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

  // Arbitrary for valid passwords (at least 8 characters)
  const validPasswordArb = fc.string({ minLength: 8 })

  // Arbitrary for positive IDs (required for toDTO)
  const validIdArb = fc.integer({ min: 1 })

  /**
   * Helper function to create a User entity from UserDTO data.
   * Since UserDTO excludes password for security, we need to provide one.
   */
  function userFromDTO(dto: UserDTO, password: string): User {
    return User.create({
      id: dto.id,
      name: dto.name,
      email: dto.email,
      password,
    })
  }

  it("should preserve id, name, and email through User → DTO → User round trip", () => {
    fc.assert(
      fc.property(
        validIdArb,
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validPasswordArb,
        (id, name, email, originalPassword, newPassword) => {
          // Create original User entity with an ID (required for toDTO)
          const originalUser = User.create({
            id,
            name,
            email,
            password: originalPassword,
          })

          // Convert to DTO
          const dto = originalUser.toDTO()

          // Convert back to User (with a potentially different password)
          const reconstructedUser = userFromDTO(dto, newPassword)

          // Verify preserved fields are equivalent
          expect(reconstructedUser.id).toBe(originalUser.id)
          expect(reconstructedUser.name).toBe(originalUser.name)
          expect(reconstructedUser.email).toBe(originalUser.email)

          // Password is intentionally NOT preserved in DTO for security
          // The reconstructed user has the new password, not the original
          expect(reconstructedUser.password).toBe(newPassword)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should produce UserDTO with correct structure (id, name, email only)", () => {
    fc.assert(
      fc.property(
        validIdArb,
        validNameArb,
        validEmailArb,
        validPasswordArb,
        (id, name, email, password) => {
          const user = User.create({ id, name, email, password })
          const dto = user.toDTO()

          // DTO should have exactly these three properties
          expect(dto).toHaveProperty("id")
          expect(dto).toHaveProperty("name")
          expect(dto).toHaveProperty("email")

          // DTO should NOT contain password (security requirement)
          expect(dto).not.toHaveProperty("password")

          // Values should match
          expect(dto.id).toBe(id)
          expect(dto.name).toBe(name)
          expect(dto.email).toBe(email)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should maintain data integrity: DTO values exactly match User getters", () => {
    fc.assert(
      fc.property(
        validIdArb,
        validNameArb,
        validEmailArb,
        validPasswordArb,
        (id, name, email, password) => {
          const user = User.create({ id, name, email, password })
          const dto = user.toDTO()

          // DTO values should exactly match the User's getter values
          expect(dto.id).toBe(user.id)
          expect(dto.name).toBe(user.name)
          expect(dto.email).toBe(user.email)
        },
      ),
      { numRuns: 100 },
    )
  })
})
