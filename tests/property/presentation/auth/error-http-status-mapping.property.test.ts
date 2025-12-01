import {
  InvalidCredentialsError,
  InvalidTokenError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from "#domain/auth/auth.errors.js"
import {
  errorStatusMapping,
  mapErrorToHttpStatus,
} from "#presentation/shared/http-status.mapper.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 13: Auth Error to HTTP Status Mapping**
 * **Validates: Requirements 5.3**
 *
 * For any auth domain error type, the presentation layer SHALL map it to a consistent
 * HTTP status code: InvalidCredentialsError → 401, UserNotFoundError → 404,
 * ValidationError → 400, InvalidTokenError → 401.
 */
describe("Auth Error to HTTP Status Mapping - Property Tests", () => {
  // Arbitrary for user identifiers
  const userIdArb = fc.oneof(
    fc.integer({ min: 1, max: 1000000 }),
    fc.string({ minLength: 1, maxLength: 36 }),
  )

  // Arbitrary for email addresses
  const emailArb = fc
    .tuple(
      fc
        .string({ minLength: 1, maxLength: 20 })
        .filter(s => /^[a-z0-9]+$/i.test(s)),
      fc
        .string({ minLength: 1, maxLength: 10 })
        .filter(s => /^[a-z0-9]+$/i.test(s)),
      fc.constantFrom("com", "org", "net", "io"),
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

  // Arbitrary for error messages
  const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 })

  describe("InvalidCredentialsError mapping", () => {
    it("should always map InvalidCredentialsError to 401", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const error = new InvalidCredentialsError()
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(401)
          expect(error.code).toBe("INVALID_CREDENTIALS")
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("UserNotFoundError mapping", () => {
    it("should always map UserNotFoundError to 404", () => {
      fc.assert(
        fc.property(userIdArb, id => {
          const error = new UserNotFoundError(id)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(404)
          expect(error.code).toBe("USER_NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })

    it("should map UserNotFoundError regardless of identifier type", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer({ min: 1 }), fc.string({ minLength: 1 })),
          id => {
            const error = new UserNotFoundError(id)
            const statusCode = mapErrorToHttpStatus(error)

            expect(statusCode).toBe(404)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("UserAlreadyExistsError mapping", () => {
    it("should always map UserAlreadyExistsError to 400", () => {
      fc.assert(
        fc.property(emailArb, email => {
          const error = new UserAlreadyExistsError(email)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(400)
          expect(error.code).toBe("USER_ALREADY_EXISTS")
        }),
        { numRuns: 100 },
      )
    })

    it("should map UserAlreadyExistsError regardless of email content", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), email => {
          const error = new UserAlreadyExistsError(email)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(400)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("InvalidTokenError mapping", () => {
    it("should always map InvalidTokenError to 401", () => {
      fc.assert(
        fc.property(errorMessageArb, message => {
          const error = new InvalidTokenError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(401)
          expect(error.code).toBe("INVALID_TOKEN")
        }),
        { numRuns: 100 },
      )
    })

    it("should map InvalidTokenError with default message to 401", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const error = new InvalidTokenError()
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(401)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Auth error mapping consistency", () => {
    it("should have all auth error codes in mapping", () => {
      expect(errorStatusMapping).toHaveProperty("INVALID_CREDENTIALS", 401)
      expect(errorStatusMapping).toHaveProperty("USER_NOT_FOUND", 404)
      expect(errorStatusMapping).toHaveProperty("USER_ALREADY_EXISTS", 400)
      expect(errorStatusMapping).toHaveProperty("INVALID_TOKEN", 401)
    })

    it("should map auth error codes to valid HTTP status codes", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            "INVALID_CREDENTIALS",
            "USER_NOT_FOUND",
            "USER_ALREADY_EXISTS",
            "INVALID_TOKEN",
          ),
          code => {
            const statusCode = errorStatusMapping[code]

            expect(statusCode).toBeGreaterThanOrEqual(400)
            expect(statusCode).toBeLessThan(600)
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should return consistent status for same error type", () => {
      fc.assert(
        fc.property(userIdArb, id => {
          const error1 = new UserNotFoundError(id)
          const error2 = new UserNotFoundError(id)

          const status1 = mapErrorToHttpStatus(error1)
          const status2 = mapErrorToHttpStatus(error2)

          expect(status1).toBe(status2)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Auth error type discrimination", () => {
    it("should map different auth error types to their specific status codes", () => {
      fc.assert(
        fc.property(
          userIdArb,
          emailArb,
          errorMessageArb,
          (id, email, message) => {
            const credentialsError = new InvalidCredentialsError()
            const notFoundError = new UserNotFoundError(id)
            const existsError = new UserAlreadyExistsError(email)
            const tokenError = new InvalidTokenError(message)

            expect(mapErrorToHttpStatus(credentialsError)).toBe(401)
            expect(mapErrorToHttpStatus(notFoundError)).toBe(404)
            expect(mapErrorToHttpStatus(existsError)).toBe(400)
            expect(mapErrorToHttpStatus(tokenError)).toBe(401)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
