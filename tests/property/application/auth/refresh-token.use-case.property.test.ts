import { RefreshTokenUseCase } from "#application/auth/use-cases/refresh-token.use-case.js"
import type { TokenService } from "#domain/auth/index.js"
import { InvalidTokenError } from "#domain/auth/index.js"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * **Feature: auth-clean-architecture, Property 7: Token Refresh Round Trip**
 * **Validates: Requirements 2.3**
 *
 * For any valid refresh token, the RefreshTokenUseCase SHALL return new access
 * and refresh tokens. For invalid or expired tokens, it SHALL return InvalidTokenError.
 */
describe("RefreshTokenUseCase - Property Tests", () => {
  // Arbitrary for user IDs
  const userIdArb = fc.integer({ min: 1, max: 1000000 })

  // Arbitrary for session IDs
  const sessionIdArb = fc.string({ minLength: 10, maxLength: 30 })

  // Arbitrary for token strings
  const tokenArb = fc.string({ minLength: 20, maxLength: 100 })

  // Create mock token service for valid tokens
  const createMockTokenServiceForValidToken = (
    userId: number,
    session: string,
    newAccessToken: string,
    newRefreshToken: string,
  ): TokenService => ({
    generateTokenPair: () =>
      Promise.resolve({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }),
    verifyAccessToken: () => ({ userId, session }),
    verifyRefreshToken: () => Promise.resolve({ userId, session }),
    invalidateRefreshToken: () => Promise.resolve(),
  })

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

  it("should return new tokens for valid refresh token", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        sessionIdArb,
        tokenArb,
        tokenArb,
        tokenArb,
        async (
          userId,
          session,
          refreshToken,
          newAccessToken,
          newRefreshToken,
        ) => {
          const tokenService = createMockTokenServiceForValidToken(
            userId,
            session,
            newAccessToken,
            newRefreshToken,
          )

          const useCase = new RefreshTokenUseCase(tokenService)

          const result = await useCase.execute({ refreshToken })

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data?.access_token).toBe(newAccessToken)
          expect(result.data?.refresh_token).toBe(newRefreshToken)
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

        const useCase = new RefreshTokenUseCase(tokenService)

        const result = await useCase.execute({ refreshToken })

        expect(result.success).toBe(false)
        expect(result.error).toBeInstanceOf(InvalidTokenError)
        expect(result.error?.code).toBe("INVALID_TOKEN")
        expect(result.data).toBeUndefined()
      }),
      { numRuns: 100 },
    )
  })

  it("should preserve session across token refresh", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        sessionIdArb,
        tokenArb,
        async (userId, session, refreshToken) => {
          let capturedSession: string | undefined

          const tokenService: TokenService = {
            generateTokenPair: (_uid, sess) => {
              capturedSession = sess
              return Promise.resolve({
                accessToken: "new_access",
                refreshToken: "new_refresh",
              })
            },
            verifyAccessToken: () => ({ userId, session }),
            verifyRefreshToken: () => Promise.resolve({ userId, session }),
            invalidateRefreshToken: () => Promise.resolve(),
          }

          const useCase = new RefreshTokenUseCase(tokenService)

          await useCase.execute({ refreshToken })

          // Session should be preserved from the original token
          expect(capturedSession).toBe(session)
        },
      ),
      { numRuns: 100 },
    )
  })
})
