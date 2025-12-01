import { SignupUseCase } from "#application/auth/use-cases/signup.use-case.js"
import type {
  PasswordService,
  TokenService,
  UserRepository,
} from "#domain/auth/index.js"
import { User, UserAlreadyExistsError } from "#domain/auth/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 6: Signup User Creation**
 * **Validates: Requirements 2.2**
 *
 * For any valid signup input (unique email, valid password), the SignupUseCase
 * SHALL create a new user and return tokens. For duplicate emails, it SHALL
 * return UserAlreadyExistsError.
 */
describe("SignupUseCase - Property Tests", () => {
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
  const createMockPasswordService = (): PasswordService => ({
    hash: (password: string) => Promise.resolve(`hashed_${password}`),
    verify: () => Promise.resolve(true),
  })

  // Create mock user repository for new user (no existing user)
  const createMockUserRepositoryForNewUser = (
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

  // Create mock user repository for existing user
  const createMockUserRepositoryForExistingUser = (
    existingUser: User,
  ): UserRepository => ({
    findById: () => Promise.resolve(existingUser),
    findByEmail: () => Promise.resolve(existingUser),
    save: (user: User) => Promise.resolve(user),
  })

  it("should return tokens for valid signup input (unique email)", async () => {
    await fc.assert(
      fc.asyncProperty(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        userIdArb,
        sessionIdArb,
        async (name, email, password, userId, session) => {
          const accessToken = `access_${session}`
          const refreshToken = `refresh_${session}`

          const userRepository = createMockUserRepositoryForNewUser(userId)
          const tokenService = createMockTokenService(accessToken, refreshToken)
          const passwordService = createMockPasswordService()

          const useCase = new SignupUseCase(
            userRepository,
            tokenService,
            passwordService,
          )

          const result = await useCase.execute({ name, email, password })

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

  it("should return UserAlreadyExistsError for duplicate email", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        validNameArb,
        validEmailArb,
        validPasswordArb,
        async (userId, name, email, password) => {
          const existingUser = User.create({
            id: userId,
            name,
            email,
            password: `hashed_${password}`,
          })

          const userRepository =
            createMockUserRepositoryForExistingUser(existingUser)
          const tokenService = createMockTokenService("access", "refresh")
          const passwordService = createMockPasswordService()

          const useCase = new SignupUseCase(
            userRepository,
            tokenService,
            passwordService,
          )

          const result = await useCase.execute({ name, email, password })

          expect(result.success).toBe(false)
          expect(result.error).toBeInstanceOf(UserAlreadyExistsError)
          expect(result.error?.code).toBe("USER_ALREADY_EXISTS")
          expect(result.data).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })
})
