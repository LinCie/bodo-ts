import { User } from "#domain/auth/user.entity.js"
import { ValidationError } from "#domain/shared/errors/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 1: User Entity Validation Consistency**
 * **Validates: Requirements 1.1, 1.2**
 *
 * For any set of user properties, creating a User entity with valid properties
 * (non-empty name, valid email format, password >= 8 characters) SHALL succeed,
 * and creating a User entity with invalid properties SHALL throw a ValidationError
 * with specific violation messages.
 */
describe("User Entity Validation - Property Tests", () => {
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

  // Arbitrary for invalid names (empty or whitespace only)
  const invalidNameArb = fc.constantFrom("", "   ", "\t", "\n", "  \t\n  ")

  // Arbitrary for invalid emails
  const invalidEmailArb = fc.oneof(
    fc.constant(""),
    fc.string().filter(s => !s.includes("@")),
    fc.string().filter(s => s.includes("@") && !s.includes(".")),
    fc.constant("test@"),
    fc.constant("@test.com"),
    fc.constant("test@.com"),
  )

  // Arbitrary for invalid passwords (less than 8 characters)
  const invalidPasswordArb = fc.oneof(
    fc.constant(""),
    fc.string({ minLength: 1, maxLength: 7 }),
  )

  it("should successfully create User with valid properties", () => {
    fc.assert(
      fc.property(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        (name, email, password) => {
          const user = User.create({
            name,
            email,
            password,
          })

          expect(user).toBeInstanceOf(User)
          expect(user.name).toBe(name)
          expect(user.email).toBe(email)
          expect(user.password).toBe(password)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for empty name", () => {
    fc.assert(
      fc.property(
        invalidNameArb,
        validEmailArb,
        validPasswordArb,
        (emptyName, email, password) => {
          expect(() =>
            User.create({
              name: emptyName,
              email,
              password,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for invalid email format", () => {
    fc.assert(
      fc.property(
        validNameArb,
        invalidEmailArb,
        validPasswordArb,
        (name, invalidEmail, password) => {
          expect(() =>
            User.create({
              name,
              email: invalidEmail,
              password,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should throw ValidationError for password less than 8 characters", () => {
    fc.assert(
      fc.property(
        validNameArb,
        validEmailArb,
        invalidPasswordArb,
        (name, email, shortPassword) => {
          expect(() =>
            User.create({
              name,
              email,
              password: shortPassword,
            }),
          ).toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should include specific violation messages in ValidationError", () => {
    fc.assert(
      fc.property(
        invalidNameArb,
        invalidEmailArb,
        invalidPasswordArb,
        (invalidName, invalidEmail, invalidPassword) => {
          let caughtError: ValidationError | null = null
          try {
            User.create({
              name: invalidName,
              email: invalidEmail,
              password: invalidPassword,
            })
          } catch (error) {
            caughtError = error as ValidationError
          }

          expect(caughtError).toBeInstanceOf(ValidationError)
          expect(caughtError?.violations).toContain("Name is required")
          expect(caughtError?.violations).toContain("Valid email is required")
          expect(caughtError?.violations).toContain(
            "Password must be at least 8 characters",
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})
