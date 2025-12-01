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
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: infrastructure-middleware-migration, Property 1: Domain Error Code Consistency**
 * **Validates: Requirements 1.1**
 *
 * For any DomainError subclass, the error SHALL have a non-empty `code` property
 * that uniquely identifies the error type.
 */
describe("Domain Error Code Consistency - Property Tests", () => {
  // Arbitrary for non-empty error messages
  const messageArb = fc
    .string({ minLength: 1 })
    .filter(s => s.trim().length > 0)

  // Factory functions for creating each error type with a message
  const createErrorFactories = (
    message: string,
  ): {
    error: DomainError
    expectedCode: string
  }[] => [
    { error: new BadRequestError(message), expectedCode: "BAD_REQUEST" },
    {
      error: new BusinessRuleViolationError(message),
      expectedCode: "BUSINESS_RULE_VIOLATION",
    },
    {
      error: new EntityNotFoundError("Entity", message),
      expectedCode: "ENTITY_NOT_FOUND",
    },
    { error: new ForbiddenError(message), expectedCode: "FORBIDDEN" },
    {
      error: new InternalServerError(message),
      expectedCode: "INTERNAL_SERVER_ERROR",
    },
    { error: new NotFoundError(message), expectedCode: "NOT_FOUND" },
    { error: new UnauthorizedError(message), expectedCode: "UNAUTHORIZED" },
    {
      error: new UniqueConstraintError(message),
      expectedCode: "UNIQUE_CONSTRAINT",
    },
    {
      error: new ValidationError([message]),
      expectedCode: "VALIDATION_ERROR",
    },
  ]

  it("should have non-empty code property for all domain error instances", () => {
    fc.assert(
      fc.property(messageArb, message => {
        const errors = createErrorFactories(message)

        for (const { error, expectedCode } of errors) {
          // Property: code must be non-empty string
          expect(typeof error.code).toBe("string")
          expect(error.code.length).toBeGreaterThan(0)
          expect(error.code.trim().length).toBeGreaterThan(0)

          // Property: code must match expected value
          expect(error.code).toBe(expectedCode)

          // Property: error must be instance of DomainError
          expect(error).toBeInstanceOf(DomainError)
          expect(error).toBeInstanceOf(Error)
        }
      }),
      { numRuns: 100 },
    )
  })

  it("should have unique code for each error class", () => {
    const errors = createErrorFactories("test")
    const codes = errors.map(({ expectedCode }) => expectedCode)
    const uniqueCodes = new Set(codes)

    // Property: all codes must be unique
    expect(uniqueCodes.size).toBe(codes.length)
  })

  it("should preserve error message in all domain error instances", () => {
    fc.assert(
      fc.property(messageArb, message => {
        // Test errors with simple message constructor
        const simpleMessageErrors = [
          new BadRequestError(message),
          new ForbiddenError(message),
          new InternalServerError(message),
          new NotFoundError(message),
          new UnauthorizedError(message),
          new UniqueConstraintError(message),
          new BusinessRuleViolationError(message),
        ]

        for (const error of simpleMessageErrors) {
          expect(error.message).toBe(message)
        }

        // Test ValidationError with violations array
        const validationError = new ValidationError([message])
        expect(validationError.message).toContain(message)
        expect(validationError.violations).toContain(message)

        // Test EntityNotFoundError with entity name and id
        const entityError = new EntityNotFoundError("TestEntity", message)
        expect(entityError.message).toContain("TestEntity")
        expect(entityError.message).toContain(message)
      }),
      { numRuns: 100 },
    )
  })

  it("should use default message when none provided", () => {
    // Test errors with default messages
    const defaultMessageErrors = [
      { error: new BadRequestError(), expectedDefault: "Bad request" },
      { error: new ForbiddenError(), expectedDefault: "Forbidden" },
      {
        error: new InternalServerError(),
        expectedDefault: "Internal server error",
      },
      { error: new NotFoundError(), expectedDefault: "Not found" },
      { error: new UnauthorizedError(), expectedDefault: "Unauthorized" },
      {
        error: new UniqueConstraintError(),
        expectedDefault: "Unique constraint violation",
      },
    ]

    for (const { error, expectedDefault } of defaultMessageErrors) {
      expect(error.message).toBe(expectedDefault)
      expect(error.code.length).toBeGreaterThan(0)
    }
  })
})
