import {
  BusinessRuleViolationError,
  DomainError,
  EntityNotFoundError,
  ValidationError,
} from "#domain/shared/errors/index.js"
import {
  errorStatusMapping,
  mapErrorToHttpStatus,
} from "#presentation/shared/http-status.mapper.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: clean-architecture, Property 10: Error to HTTP Status Mapping**
 * **Validates: Requirements 4.3**
 *
 * For any domain error type, the presentation layer SHALL map it to a consistent
 * HTTP status code: EntityNotFoundError → 404, ValidationError → 400,
 * BusinessRuleViolationError → 422.
 */
describe("Error to HTTP Status Mapping - Property Tests", () => {
  // Arbitrary for validation error violations
  const violationsArb = fc.array(fc.string({ minLength: 1 }), {
    minLength: 1,
    maxLength: 5,
  })

  // Arbitrary for entity names
  const entityNameArb = fc.string({ minLength: 1, maxLength: 50 })

  // Arbitrary for entity IDs
  const entityIdArb = fc.oneof(
    fc.integer({ min: 1, max: 1000000 }),
    fc.string({ minLength: 1, maxLength: 36 }),
  )

  // Arbitrary for error messages
  const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 })

  describe("ValidationError mapping", () => {
    it("should always map ValidationError to 400", () => {
      fc.assert(
        fc.property(violationsArb, violations => {
          const error = new ValidationError(violations)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(400)
          expect(error.code).toBe("VALIDATION_ERROR")
        }),
        { numRuns: 100 },
      )
    })

    it("should map ValidationError regardless of violation content", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
          violations => {
            const error = new ValidationError(violations)
            const statusCode = mapErrorToHttpStatus(error)

            expect(statusCode).toBe(400)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("EntityNotFoundError mapping", () => {
    it("should always map EntityNotFoundError to 404", () => {
      fc.assert(
        fc.property(entityNameArb, entityIdArb, (entityName, id) => {
          const error = new EntityNotFoundError(entityName, id)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(404)
          expect(error.code).toBe("ENTITY_NOT_FOUND")
        }),
        { numRuns: 100 },
      )
    })

    it("should map EntityNotFoundError regardless of entity name", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer({ min: 1 }), (entityName, id) => {
          const error = new EntityNotFoundError(entityName, id)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(404)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("BusinessRuleViolationError mapping", () => {
    it("should always map BusinessRuleViolationError to 422", () => {
      fc.assert(
        fc.property(errorMessageArb, message => {
          const error = new BusinessRuleViolationError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(422)
          expect(error.code).toBe("BUSINESS_RULE_VIOLATION")
        }),
        { numRuns: 100 },
      )
    })

    it("should map BusinessRuleViolationError regardless of message content", () => {
      fc.assert(
        fc.property(fc.string(), message => {
          const error = new BusinessRuleViolationError(message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(422)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Unknown error mapping", () => {
    // Custom domain error for testing unknown codes
    class UnknownDomainError extends DomainError {
      readonly code: string

      constructor(code: string, message: string) {
        super(message)
        this.code = code
      }
    }

    it("should map unknown error codes to 500", () => {
      // Arbitrary for unknown error codes (not in the mapping)
      const unknownCodeArb = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter(
          code =>
            ![
              "ENTITY_NOT_FOUND",
              "VALIDATION_ERROR",
              "BUSINESS_RULE_VIOLATION",
            ].includes(code),
        )

      fc.assert(
        fc.property(unknownCodeArb, errorMessageArb, (code, message) => {
          const error = new UnknownDomainError(code, message)
          const statusCode = mapErrorToHttpStatus(error)

          expect(statusCode).toBe(500)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("Mapping consistency", () => {
    it("should return consistent status for same error type", () => {
      fc.assert(
        fc.property(violationsArb, violations => {
          const error1 = new ValidationError(violations)
          const error2 = new ValidationError(violations)

          const status1 = mapErrorToHttpStatus(error1)
          const status2 = mapErrorToHttpStatus(error2)

          expect(status1).toBe(status2)
        }),
        { numRuns: 100 },
      )
    })

    it("should have all expected error codes in mapping", () => {
      // Verify the mapping contains all expected codes
      expect(errorStatusMapping).toHaveProperty("ENTITY_NOT_FOUND", 404)
      expect(errorStatusMapping).toHaveProperty("VALIDATION_ERROR", 400)
      expect(errorStatusMapping).toHaveProperty("BUSINESS_RULE_VIOLATION", 422)
    })

    it("should map error codes to valid HTTP status codes", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            "ENTITY_NOT_FOUND",
            "VALIDATION_ERROR",
            "BUSINESS_RULE_VIOLATION",
          ),
          code => {
            const statusCode = errorStatusMapping[code]

            // Status code should be a valid HTTP error status
            expect(statusCode).toBeGreaterThanOrEqual(400)
            expect(statusCode).toBeLessThan(600)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("Error type discrimination", () => {
    it("should map different error types to different status codes", () => {
      fc.assert(
        fc.property(
          violationsArb,
          entityNameArb,
          entityIdArb,
          errorMessageArb,
          (violations, entityName, entityId, message) => {
            const validationError = new ValidationError(violations)
            const notFoundError = new EntityNotFoundError(entityName, entityId)
            const businessError = new BusinessRuleViolationError(message)

            const validationStatus = mapErrorToHttpStatus(validationError)
            const notFoundStatus = mapErrorToHttpStatus(notFoundError)
            const businessStatus = mapErrorToHttpStatus(businessError)

            // Each error type should map to its specific status
            expect(validationStatus).toBe(400)
            expect(notFoundStatus).toBe(404)
            expect(businessStatus).toBe(422)

            // All three should be different
            expect(
              new Set([validationStatus, notFoundStatus, businessStatus]).size,
            ).toBe(3)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
