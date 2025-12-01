import {
  BadRequestError,
  BusinessRuleViolationError,
  DomainError,
  EntityNotFoundError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  UniqueConstraintError,
  ValidationError,
} from "#domain/shared/errors/index.js"
import {
  errorStatusMapping,
  mapErrorToHttpStatus,
} from "#presentation/shared/http-status.mapper.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: infrastructure-middleware-migration, Property 2: Error to HTTP Status Mapping Completeness**
 * **Validates: Requirements 2.3**
 *
 * For any DomainError with a defined code, the HTTP status mapper SHALL return
 * a status code between 400-599 (never returning undefined or a success status).
 */
describe("Error to HTTP Status Mapping Completeness - Property Tests", () => {
  // Arbitrary for non-empty error messages
  const messageArb = fc
    .string({ minLength: 1 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for validation violations
  const violationsArb = fc.array(fc.string({ minLength: 1 }), {
    minLength: 1,
    maxLength: 5,
  })

  // Arbitrary for entity names and IDs
  const entityNameArb = fc.string({ minLength: 1, maxLength: 50 })
  const entityIdArb = fc.oneof(
    fc.integer({ min: 1, max: 1000000 }),
    fc.string({ minLength: 1, maxLength: 36 }),
  )

  // Factory to create all domain error types
  const createAllDomainErrors = (
    message: string,
    violations: string[],
    entityName: string,
    entityId: string | number,
  ): DomainError[] => [
    new BadRequestError(message),
    new UnauthorizedError(message),
    new ForbiddenError(message),
    new NotFoundError(message),
    new UniqueConstraintError(message),
    new InternalServerError(message),
    new ValidationError(violations),
    new EntityNotFoundError(entityName, entityId),
    new BusinessRuleViolationError(message),
  ]

  describe("HTTP status code range validation", () => {
    it("should return status codes between 400-599 for all domain errors", () => {
      fc.assert(
        fc.property(
          messageArb,
          violationsArb,
          entityNameArb,
          entityIdArb,
          (message, violations, entityName, entityId) => {
            const errors = createAllDomainErrors(
              message,
              violations,
              entityName,
              entityId,
            )

            for (const error of errors) {
              const statusCode = mapErrorToHttpStatus(error)

              // Property: status code must be in HTTP error range (400-599)
              expect(statusCode).toBeGreaterThanOrEqual(400)
              expect(statusCode).toBeLessThan(600)

              // Property: status code must be a number (not undefined)
              expect(typeof statusCode).toBe("number")
            }
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should never return success status codes (1xx, 2xx, 3xx)", () => {
      fc.assert(
        fc.property(
          messageArb,
          violationsArb,
          entityNameArb,
          entityIdArb,
          (message, violations, entityName, entityId) => {
            const errors = createAllDomainErrors(
              message,
              violations,
              entityName,
              entityId,
            )

            for (const error of errors) {
              const statusCode = mapErrorToHttpStatus(error)

              // Property: never return success status codes
              expect(statusCode).not.toBeLessThan(400)
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("New HTTP-related error mappings", () => {
    it("should map BAD_REQUEST to 400", () => {
      fc.assert(
        fc.property(messageArb, message => {
          const error = new BadRequestError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(400)
          expect(error.code).toBe("BAD_REQUEST")
        }),
        { numRuns: 100 },
      )
    })

    it("should map UNAUTHORIZED to 401", () => {
      fc.assert(
        fc.property(messageArb, message => {
          const error = new UnauthorizedError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(401)
          expect(error.code).toBe("UNAUTHORIZED")
        }),
        { numRuns: 100 },
      )
    })

    it("should map FORBIDDEN to 403", () => {
      fc.assert(
        fc.property(messageArb, message => {
          const error = new ForbiddenError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(403)
          expect(error.code).toBe("FORBIDDEN")
        }),
        { numRuns: 100 },
      )
    })

    it("should map NOT_FOUND to 404", () => {
      fc.assert(
        fc.property(messageArb, message => {
          const error = new NotFoundError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(404)
          expect(error.code).toBe("NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })

    it("should map UNIQUE_CONSTRAINT to 409", () => {
      fc.assert(
        fc.property(messageArb, message => {
          const error = new UniqueConstraintError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(409)
          expect(error.code).toBe("UNIQUE_CONSTRAINT")
        }),
        { numRuns: 100 },
      )
    })

    it("should map INTERNAL_SERVER_ERROR to 500", () => {
      fc.assert(
        fc.property(messageArb, message => {
          const error = new InternalServerError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(500)
          expect(error.code).toBe("INTERNAL_SERVER_ERROR")
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Error status mapping completeness", () => {
    it("should have all new HTTP-related error codes in mapping", () => {
      expect(errorStatusMapping).toHaveProperty("BAD_REQUEST", 400)
      expect(errorStatusMapping).toHaveProperty("UNAUTHORIZED", 401)
      expect(errorStatusMapping).toHaveProperty("FORBIDDEN", 403)
      expect(errorStatusMapping).toHaveProperty("NOT_FOUND", 404)
      expect(errorStatusMapping).toHaveProperty("UNIQUE_CONSTRAINT", 409)
      expect(errorStatusMapping).toHaveProperty("INTERNAL_SERVER_ERROR", 500)
    })

    it("should map all error codes in mapping to valid HTTP error status codes", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(errorStatusMapping)),
          code => {
            const statusCode = errorStatusMapping[code]

            // Property: all mapped status codes must be HTTP error codes
            expect(statusCode).toBeGreaterThanOrEqual(400)
            expect(statusCode).toBeLessThan(600)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("Unknown error code fallback", () => {
    // Custom domain error for testing unknown codes
    class UnknownDomainError extends DomainError {
      readonly code: string

      constructor(code: string, message: string) {
        super(message)
        this.code = code
      }
    }

    it("should map unknown error codes to 500", () => {
      const knownCodes = Object.keys(errorStatusMapping)
      const unknownCodeArb = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter(code => !knownCodes.includes(code))

      fc.assert(
        fc.property(unknownCodeArb, messageArb, (code, message) => {
          const error = new UnknownDomainError(code, message)
          const statusCode = mapErrorToHttpStatus(error)

          // Property: unknown codes should fallback to 500
          expect(statusCode).toBe(500)
        }),
        { numRuns: 100 },
      )
    })
  })
})
