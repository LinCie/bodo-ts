import { SigninUseCase } from "#application/auth/use-cases/signin.use-case.js"
import type {
  PasswordService,
  TokenService,
  UserRepository,
} from "#domain/auth/index.js"
import { InvalidCredentialsError, User } from "#domain/auth/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 5: Signin Credential Validation**
 * **Validates: Requirements 2.1**
 *
 * For any signin attempt with valid credentials (existing user, correct password),
 * the SigninUseCase SHALL return a Result with access and refresh tokens.
 * For invalid credentials, it SHALL return a Result with InvalidCredentialsError.
 */
describe("SigninUseCase - Property Tests", () => {
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

  // Create mock token service
  const createMockTokenService = (
    accessToken: string,
    refreshToken: string,
  ): TokenService => ({
    generateTokenPair: () => Promise.resolve({ accessToken, refreshToken }),
    verifyAccessToken: () => ({ userId: 1, session: "test" }),
    verifyRefreshToken: () => Promise.resolve({ userId: 1, session: "test" }),
    invalidateRefreshToken: () => Promise.resolve(),
  })

  // Create mock password service
  const createMockPasswordService = (
    shouldMatch: boolean,
  ): PasswordService => ({
    hash: (password: string) => Promise.resolve(`hashed_${password}`),
    verify: () => Promise.resolve(shouldMatch),
  })

  // Create mock user repository
  const createMockUserRepository = (user: User | null): UserRepository => ({
    findById: () => Promise.resolve(user),
    findByEmail: () => Promise.resolve(user),
    save: (u: User) => Promise.resolve(u),
  })

  it("should return tokens for valid credentials (existing user, correct password)", async () => {
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

          const accessToken = `access_${session}`
          const refreshToken = `refresh_${session}`

          const userRepository = createMockUserRepository(user)
          const tokenService = createMockTokenService(accessToken, refreshToken)
          const passwordService = createMockPasswordService(true)

          const useCase = new SigninUseCase(
            userRepository,
            tokenService,
            passwordService,
          )

          const result = await useCase.execute({ email, password })

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data?.access_token).toBe(accessToken)
          expect(result.data?.refresh_token).toBe(refreshToken)
          expect(result.error).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should return InvalidCredentialsError for non-existent user", async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        async (email, password) => {
          const userRepository = createMockUserRepository(null)
          const tokenService = createMockTokenService("access", "refresh")
          const passwordService = createMockPasswordService(true)

          const useCase = new SigninUseCase(
            userRepository,
            tokenService,
            passwordService,
          )

          const result = await useCase.execute({ email, password })

          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(InvalidCredentialsError)
          expect(result.error?.code).toBe("INVALID_CREDENTIALS")
          expect(result.data).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should return InvalidCredentialsError for wrong password", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validPasswordArb,
        async (userId, name, email, correctPassword, wrongPassword) => {
          const user = User.create({
            id: userId,
            name,
            email,
            password: `hashed_${correctPassword}`,
          })

          const userRepository = createMockUserRepository(user)
          const tokenService = createMockTokenService("access", "refresh")
          const passwordService = createMockPasswordService(false)

          const useCase = new SigninUseCase(
            userRepository,
            tokenService,
            passwordService,
          )

          const result = await useCase.execute({
            email,
            password: wrongPassword,
          })

          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(InvalidCredentialsError)
          expect(result.error?.code).toBe("INVALID_CREDENTIALS")
          expect(result.data).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })
})
