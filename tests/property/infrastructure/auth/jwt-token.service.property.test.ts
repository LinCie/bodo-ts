import * as fc from "fast-check"
import jwt from "jsonwebtoken"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { InvalidTokenError } from "#domain/auth/index.js"
import { JwtTokenService } from "#infrastructure/auth/jwt-token.service.js"

const TEST_JWT_SECRET = "test-secret-key-for-property-tests"
const TEST_TIMEOUT = 30000

// Mock Redis client for testing
const createMockRedis = () => ({
  isOpen: true,
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue("OK"),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
})

/**
 * **Feature: auth-clean-architecture, Property 10: Token Expiration Correctness**
 * **Validates: Requirements 4.1**
 *
 * For any generated token pair, the access token SHALL have a 15-minute expiration
 * and the refresh token SHALL have a 7-day expiration.
 */
describe("JwtTokenService - Token Expiration Property Tests", () => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let tokenService: JwtTokenService

  beforeEach(() => {
    mockRedis = createMockRedis()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokenService = new JwtTokenService(mockRedis as any, TEST_JWT_SECRET)
  })

  // Arbitrary for valid user IDs
  const userIdArb = fc.integer({ min: 1, max: 1000000 })

  it(
    "should generate access token with 15-minute expiration",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const { accessToken } = await tokenService.generateTokenPair(userId)
          const decoded = jwt.decode(accessToken) as jwt.JwtPayload

          expect(decoded).toBeDefined()
          expect(decoded.exp).toBeDefined()
          expect(decoded.iat).toBeDefined()

          // Access token should expire in 15 minutes (900 seconds)
          const expirationDuration = (decoded.exp ?? 0) - (decoded.iat ?? 0)
          expect(expirationDuration).toBe(900) // 15 * 60 = 900 seconds
        }),
        { numRuns: 20 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should generate refresh token with 7-day expiration",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const { refreshToken } = await tokenService.generateTokenPair(userId)
          const decoded = jwt.decode(refreshToken) as jwt.JwtPayload

          expect(decoded).toBeDefined()
          expect(decoded.exp).toBeDefined()
          expect(decoded.iat).toBeDefined()

          // Refresh token should expire in 7 days (604800 seconds)
          const expirationDuration = (decoded.exp ?? 0) - (decoded.iat ?? 0)
          expect(expirationDuration).toBe(604800) // 7 * 24 * 60 * 60 = 604800 seconds
        }),
        { numRuns: 20 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should include correct userId in token payload",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const { accessToken, refreshToken } =
            await tokenService.generateTokenPair(userId)

          const accessDecoded = jwt.decode(accessToken) as jwt.JwtPayload
          const refreshDecoded = jwt.decode(refreshToken) as jwt.JwtPayload

          expect(Number(accessDecoded.sub)).toBe(userId)
          expect(Number(refreshDecoded.sub)).toBe(userId)
        }),
        { numRuns: 20 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should include session identifier (jti) in both tokens",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const { accessToken, refreshToken } =
            await tokenService.generateTokenPair(userId)

          const accessDecoded = jwt.decode(accessToken) as jwt.JwtPayload
          const refreshDecoded = jwt.decode(refreshToken) as jwt.JwtPayload

          expect(accessDecoded.jti).toBeDefined()
          expect(refreshDecoded.jti).toBeDefined()
          // Both tokens should have the same session ID
          expect(accessDecoded.jti).toBe(refreshDecoded.jti)
        }),
        { numRuns: 20 },
      )
    },
    TEST_TIMEOUT,
  )

  it("should reject expired access tokens", () => {
    // Create a token that's already expired
    const expiredToken = jwt.sign(
      { sub: 1, jti: "test-session" },
      TEST_JWT_SECRET,
      { expiresIn: "-1s" },
    )

    expect(() => tokenService.verifyAccessToken(expiredToken)).toThrow(
      InvalidTokenError,
    )
  })
})
