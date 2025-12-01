import argon2 from "argon2"
import * as fc from "fast-check"
import jwt from "jsonwebtoken"
import type { RedisClientType } from "redis"
import { describe, expect, it, vi } from "vitest"

import { InvalidTokenError } from "#domain/auth/index.js"
import { JwtTokenService } from "#infrastructure/auth/jwt-token.service.js"

const TEST_JWT_SECRET = "test-secret-key-for-property-tests"
const TEST_TIMEOUT = 60000

interface MockRedis {
  isOpen: boolean
  connect: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
}

/**
 * **Feature: auth-clean-architecture, Property 11: Refresh Token Storage Verification**
 * **Validates: Requirements 4.2, 4.4, 4.5**
 *
 * For any generated refresh token, the token SHALL be verifiable against Redis storage,
 * and after invalidation, verification SHALL fail.
 */
describe("JwtTokenService - Refresh Token Storage Property Tests", () => {
  // Arbitrary for valid user IDs
  const userIdArb = fc.integer({ min: 1, max: 1000000 })

  it(
    "should store hashed refresh token in Redis on generation",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const storedTokens = new Map<string, string>()

          const mockRedis: MockRedis = {
            isOpen: true,
            connect: vi.fn().mockResolvedValue(undefined),
            set: vi.fn().mockImplementation((key: string, value: string) => {
              storedTokens.set(key, value)
              return Promise.resolve("OK")
            }),
            get: vi.fn().mockImplementation((key: string) => {
              return Promise.resolve(storedTokens.get(key) ?? null)
            }),
            del: vi.fn().mockResolvedValue(1),
          }

          const tokenService = new JwtTokenService(
            mockRedis as unknown as RedisClientType,
            TEST_JWT_SECRET,
          )
          const { refreshToken } = await tokenService.generateTokenPair(userId)

          // Verify Redis set was called
          expect(mockRedis.set).toHaveBeenCalled()

          // Verify the stored value is a hashed token (argon2 format)
          const storedHash = Array.from(storedTokens.values())[0]
          expect(storedHash).toMatch(/^\$argon2/)

          // Verify the hash matches the refresh token
          const isValid = await argon2.verify(storedHash, refreshToken)
          expect(isValid).toBe(true)
        }),
        { numRuns: 10 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should verify refresh token against Redis storage",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const storedTokens = new Map<string, string>()

          const mockRedis: MockRedis = {
            isOpen: true,
            connect: vi.fn().mockResolvedValue(undefined),
            set: vi.fn().mockImplementation((key: string, value: string) => {
              storedTokens.set(key, value)
              return Promise.resolve("OK")
            }),
            get: vi.fn().mockImplementation((key: string) => {
              return Promise.resolve(storedTokens.get(key) ?? null)
            }),
            del: vi.fn().mockResolvedValue(1),
          }

          const tokenService = new JwtTokenService(
            mockRedis as unknown as RedisClientType,
            TEST_JWT_SECRET,
          )
          const { refreshToken } = await tokenService.generateTokenPair(userId)

          // Verify the refresh token
          const payload = await tokenService.verifyRefreshToken(refreshToken)

          expect(payload.userId).toBe(userId)
          expect(payload.session).toBeDefined()
        }),
        { numRuns: 10 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should fail verification after token invalidation",
    async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          const storedTokens = new Map<string, string>()

          const mockRedis: MockRedis = {
            isOpen: true,
            connect: vi.fn().mockResolvedValue(undefined),
            set: vi.fn().mockImplementation((key: string, value: string) => {
              storedTokens.set(key, value)
              return Promise.resolve("OK")
            }),
            get: vi.fn().mockImplementation((key: string) => {
              return Promise.resolve(storedTokens.get(key) ?? null)
            }),
            del: vi.fn().mockImplementation((key: string) => {
              storedTokens.delete(key)
              return Promise.resolve(1)
            }),
          }

          const tokenService = new JwtTokenService(
            mockRedis as unknown as RedisClientType,
            TEST_JWT_SECRET,
          )
          const { refreshToken } = await tokenService.generateTokenPair(userId)

          // Verify token works before invalidation
          const payload = await tokenService.verifyRefreshToken(refreshToken)
          expect(payload.userId).toBe(userId)

          // Invalidate the token
          await tokenService.invalidateRefreshToken(userId, payload.session)

          // Verify token fails after invalidation
          await expect(
            tokenService.verifyRefreshToken(refreshToken),
          ).rejects.toThrow(InvalidTokenError)
        }),
        { numRuns: 10 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should fail verification for token not in storage",
    async () => {
      const mockRedis: MockRedis = {
        isOpen: true,
        connect: vi.fn().mockResolvedValue(undefined),
        set: vi.fn().mockResolvedValue("OK"),
        get: vi.fn().mockResolvedValue(null), // Token not found
        del: vi.fn().mockResolvedValue(1),
      }

      const tokenService = new JwtTokenService(
        mockRedis as unknown as RedisClientType,
        TEST_JWT_SECRET,
      )

      // Create a valid JWT but don't store it in Redis
      const validToken = jwt.sign(
        { sub: 1, jti: "test-session" },
        TEST_JWT_SECRET,
        { expiresIn: "7d" },
      )

      await expect(tokenService.verifyRefreshToken(validToken)).rejects.toThrow(
        InvalidTokenError,
      )
    },
    TEST_TIMEOUT,
  )
})
