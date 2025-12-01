import { SignoutUseCase } from "#application/auth/use-cases/signout.use-case.js"
import type { TokenService } from "#domain/auth/index.js"
import { InvalidTokenError } from "#domain/auth/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 8: Signout Token Invalidation**
 * **Validates: Requirements 2.4**
 *
 * For any valid refresh token, after SignoutUseCase execution, subsequent
 * refresh attempts with the same token SHALL fail with InvalidTokenError.
 */
describe("SignoutUseCase - Property Tests", () => {
  // Arbitrary for user IDs
  const userIdArb = fc.integer({ min: 1, max: 1000000 })

  // Arbitrary for session IDs
  const sessionIdArb = fc.string({ minLength: 10, maxLength: 30 })

  // Arbitrary for token strings
  const tokenArb = fc.string({ minLength: 20, maxLength: 100 })

  // Create mock token service for valid tokens that tracks invalidation
  const createMockTokenServiceWithInvalidation = (
    userId: number,
    session: string,
  ): { tokenService: TokenService; invalidatedTokens: Set<string> } => {
    const invalidatedTokens = new Set<string>()

    const tokenService: TokenService = {
      generateTokenPair: () =>
        Promise.resolve({ accessToken: "access", refreshToken: "refresh" }),
      verifyAccessToken: () => ({ userId, session }),
      verifyRefreshToken: () => {
        if (invalidatedTokens.has(`${userId}:${session}`)) {
          return Promise.reject(new InvalidTokenError())
        }
        return Promise.resolve({ userId, session })
      },
      invalidateRefreshToken: (uid, sess) => {
        invalidatedTokens.add(`${uid}:${sess}`)
        return Promise.resolve()
      },
    }

    return { tokenService, invalidatedTokens }
  }

  // Create mock token service for invalid tokens
  const createMockTokenServiceForInvalidToken = (): TokenService => ({
    generateTokenPair: () =>
      Promise.resolve({ accessToken: "access", refreshToken: "refresh" }),
    verifyAccessToken: () => {
      throw new InvalidTokenError()
    },
    verifyRefreshToken: () => {
      throw new InvalidTokenError()
    },
    invalidateRefreshToken: () => Promise.resolve(),
  })

  it("should successfully signout with valid refresh token", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        sessionIdArb,
        tokenArb,
        async (userId, session, refreshToken) => {
          const { tokenService } = createMockTokenServiceWithInvalidation(
            userId,
            session,
          )

          const useCase = new SignoutUseCase(tokenService)

          const result = await useCase.execute({ refreshToken })

          expect(result.success).toBe(true)
          expect(result.data).toBeUndefined()
          expect(result.error).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it("should return InvalidTokenError for invalid refresh token", async () => {
    await fc.assert(
      fc.asyncProperty(tokenArb, async refreshToken => {
        const tokenService = createMockTokenServiceForInvalidToken()

        const useCase = new SignoutUseCase(tokenService)

        const result = await useCase.execute({ refreshToken })

        expect(result.success).toBe(false)
        expect(result.error).toBeInstanceOf(InvalidTokenError)
        expect(result.error?.code).toBe("INVALID_TOKEN")
        expect(result.data).toBeUndefined()
      }),
      { numRuns: 100 },
    )
  })

  it("should invalidate token so subsequent refresh fails", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        sessionIdArb,
        tokenArb,
        async (userId, session, refreshToken) => {
          const { tokenService, invalidatedTokens } =
            createMockTokenServiceWithInvalidation(userId, session)

          const signoutUseCase = new SignoutUseCase(tokenService)

          // First, signout should succeed
          const signoutResult = await signoutUseCase.execute({ refreshToken })
          expect(signoutResult.success).toBe(true)

          // Token should be marked as invalidated
          expect(invalidatedTokens.has(`${userId}:${session}`)).toBe(true)

          // Subsequent verification should fail
          await expect(
            tokenService.verifyRefreshToken(refreshToken),
          ).rejects.toThrow(InvalidTokenError)
        },
      ),
      { numRuns: 100 },
    )
  })
})
