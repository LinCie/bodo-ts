import { RefreshTokenUseCase } from "#application/auth/use-cases/refresh-token.use-case.js"
import { SigninUseCase } from "#application/auth/use-cases/signin.use-case.js"
import { SignoutUseCase } from "#application/auth/use-cases/signout.use-case.js"
import { SignupUseCase } from "#application/auth/use-cases/signup.use-case.js"
import type {
  PasswordService,
  TokenService,
  UserRepository,
} from "#domain/auth/index.js"
import {
  InvalidCredentialsError,
  InvalidTokenError,
  User,
} from "#domain/auth/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 4: Auth Use Case Result Format**
 * **Validates: Requirements 2.5**
 *
 * For any auth use case execution (signin, signup, refresh, signout), the result
 * SHALL be a Result object with `success: true` and token data for successful
 * operations, or `success: false` and a domain error for failed operations.
 */
describe("Auth Use Case Result Format - Property Tests", () => {
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

  // Arbitrary for valid names
  const validNameArb = fc
    .string({ minLength: 1 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for user IDs
  const userIdArb = fc.integer({ min: 1, max: 1000000 })

  // Arbitrary for session IDs
  const sessionIdArb = fc.string({ minLength: 10, maxLength: 30 })

  // Arbitrary for token strings
  const tokenArb = fc.string({ minLength: 20, maxLength: 100 })

  // Create mock token service for success
  const createSuccessTokenService = (
    accessToken: string,
    refreshToken: string,
    userId: number,
    session: string,
  ): TokenService => ({
    generateTokenPair: () => Promise.resolve({ accessToken, refreshToken }),
    verifyAccessToken: () => ({ userId, session }),
    verifyRefreshToken: () => Promise.resolve({ userId, session }),
    invalidateRefreshToken: () => Promise.resolve(),
  })

  // Create mock token service for failure
  const createFailureTokenService = (): TokenService => ({
    generateTokenPair: () =>
      Promise.resolve({ accessToken: "access", refreshToken: "refresh" }),
    verifyAccessToken: () => {
      throw new InvalidTokenError()
    },
    verifyRefreshToken: () => Promise.reject(new InvalidTokenError()),
    invalidateRefreshToken: () => Promise.resolve(),
  })

  // Create mock password service
  const createMockPasswordService = (
    shouldMatch: boolean,
  ): PasswordService => ({
    hash: (password: string) => Promise.resolve(`hashed_${password}`),
    verify: () => Promise.resolve(shouldMatch),
  })

  // Create mock user repository for existing user
  const createUserRepositoryWithUser = (user: User): UserRepository => ({
    findById: () => Promise.resolve(user),
    findByEmail: () => Promise.resolve(user),
    save: (u: User) => Promise.resolve(u),
  })

  // Create mock user repository for no user
  const createUserRepositoryWithoutUser = (
    generatedId: number,
  ): UserRepository => ({
    findById: () => Promise.resolve(null),
    findByEmail: () => Promise.resolve(null),
    save: (user: User) =>
      Promise.resolve(
        User.create({
          id: generatedId,
          name: user.name,
          email: user.email,
          password: user.password,
        }),
      ),
  })

  describe("SigninUseCase result format", () => {
    it("should return Result with success: true and tokens for valid credentials", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validNameArb,
          validEmailArb,
          validPasswordArb,
          sessionIdArb,
          async (userId, name, email, password, session) => {
            const user = User.create({
              id: userId,
              name,
              email,
              password: `hashed_${password}`,
            })

            const tokenService = createSuccessTokenService(
              "access_token",
              "refresh_token",
              userId,
              session,
            )
            const passwordService = createMockPasswordService(true)
            const userRepository = createUserRepositoryWithUser(user)

            const useCase = new SigninUseCase(
              userRepository,
              tokenService,
              passwordService,
            )

            const result = await useCase.execute({ email, password })

            // Result format validation
            expect(typeof result.success).toBe("boolean")
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data?.access_token).toBeDefined()
            expect(result.data?.refresh_token).toBeDefined()
            expect(result.error).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should return Result with success: false and error for invalid credentials", async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailArb,
          validPasswordArb,
          async (email, password) => {
            const tokenService = createSuccessTokenService(
              "access",
              "refresh",
              1,
              "session",
            )
            const passwordService = createMockPasswordService(true)
            const userRepository = createUserRepositoryWithoutUser(1)

            const useCase = new SigninUseCase(
              userRepository,
              tokenService,
              passwordService,
            )

            const result = await useCase.execute({ email, password })

            // Result format validation
            expect(typeof result.success).toBe("boolean")
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
            expect(result.error).toBeInstanceOf(InvalidCredentialsError)
            expect(result.data).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("SignupUseCase result format", () => {
    it("should return Result with success: true and tokens for valid signup", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validNameArb,
          validEmailArb,
          validPasswordArb,
          sessionIdArb,
          async (userId, name, email, password, session) => {
            const tokenService = createSuccessTokenService(
              "access_token",
              "refresh_token",
              userId,
              session,
            )
            const passwordService = createMockPasswordService(true)
            const userRepository = createUserRepositoryWithoutUser(userId)

            const useCase = new SignupUseCase(
              userRepository,
              tokenService,
              passwordService,
            )

            const result = await useCase.execute({ name, email, password })

            // Result format validation
            expect(typeof result.success).toBe("boolean")
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data?.access_token).toBeDefined()
            expect(result.data?.refresh_token).toBeDefined()
            expect(result.error).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe("RefreshTokenUseCase result format", () => {
    it("should return Result with success: true and tokens for valid refresh", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          sessionIdArb,
          tokenArb,
          async (userId, session, refreshToken) => {
            const tokenService = createSuccessTokenService(
              "new_access",
              "new_refresh",
              userId,
              session,
            )

            const useCase = new RefreshTokenUseCase(tokenService)

            const result = await useCase.execute({ refreshToken })

            // Result format validation
            expect(typeof result.success).toBe("boolean")
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data?.access_token).toBeDefined()
            expect(result.data?.refresh_token).toBeDefined()
            expect(result.error).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should return Result with success: false and error for invalid token", async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, async refreshToken => {
          const tokenService = createFailureTokenService()

          const useCase = new RefreshTokenUseCase(tokenService)

          const result = await useCase.execute({ refreshToken })

          // Result format validation
          expect(typeof result.success).toBe("boolean")
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error).toBeInstanceOf(InvalidTokenError)
          expect(result.data).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe("SignoutUseCase result format", () => {
    it("should return Result with success: true for valid signout", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          sessionIdArb,
          tokenArb,
          async (userId, session, refreshToken) => {
            const tokenService = createSuccessTokenService(
              "access",
              "refresh",
              userId,
              session,
            )

            const useCase = new SignoutUseCase(tokenService)

            const result = await useCase.execute({ refreshToken })

            // Result format validation
            expect(typeof result.success).toBe("boolean")
            expect(result.success).toBe(true)
            expect(result.error).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })

    it("should return Result with success: false and error for invalid token", async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, async refreshToken => {
          const tokenService = createFailureTokenService()

          const useCase = new SignoutUseCase(tokenService)

          const result = await useCase.execute({ refreshToken })

          // Result format validation
          expect(typeof result.success).toBe("boolean")
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error).toBeInstanceOf(InvalidTokenError)
          expect(result.data).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })
})
