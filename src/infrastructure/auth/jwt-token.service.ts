import argon2 from "argon2"
import jwt, { type JwtPayload } from "jsonwebtoken"
import KSUID from "ksuid"
import type { RedisClientType } from "redis"

import type {
  TokenPair,
  TokenPayload,
  TokenService,
} from "#domain/auth/index.js"
import { InvalidTokenError } from "#domain/auth/index.js"

const ACCESS_TOKEN_EXPIRES_IN = "15m"
const REFRESH_TOKEN_EXPIRES_IN = "7d"
const REDIS_REFRESH_TOKEN_PREFIX = "refresh_token"
const REDIS_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // 7 days

/**
 * JWT-based implementation of the TokenService interface.
 * Handles token generation, verification, and Redis storage for refresh tokens.
 */
class JwtTokenService implements TokenService {
  constructor(
    private readonly redis: RedisClientType,
    private readonly jwtSecret: string,
  ) {}

  /**
   * Generates a new pair of access and refresh tokens.
   * Stores the refresh token hash in Redis for later verification.
   */
  async generateTokenPair(
    userId: number,
    session?: string,
  ): Promise<TokenPair> {
    const ksuid = await KSUID.random()
    const sessionId = session ?? ksuid.string

    const payload = {
      sub: userId,
      jti: sessionId,
    }

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    })

    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    })

    // Store hashed refresh token in Redis
    await this.ensureConnected()
    const redisKey = `${REDIS_REFRESH_TOKEN_PREFIX}:${userId}:${sessionId}`
    const hashedToken = await argon2.hash(refreshToken)
    await this.redis.set(redisKey, hashedToken, {
      EX: REDIS_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    })

    return { accessToken, refreshToken }
  }

  /**
   * Verifies an access token and extracts its payload.
   * @throws InvalidTokenError if token is invalid or expired
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload
      if (!payload.sub || !payload.jti) {
        throw new InvalidTokenError("Invalid token payload")
      }
      return {
        userId: Number(payload.sub),
        session: payload.jti,
      }
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error
      }
      throw new InvalidTokenError("Invalid or expired access token")
    }
  }

  /**
   * Verifies a refresh token against Redis storage.
   * @throws InvalidTokenError if token is invalid, expired, or not in storage
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload
      if (!payload.sub || !payload.jti) {
        throw new InvalidTokenError("Invalid token payload")
      }
      const userId = Number(payload.sub)
      const sessionId = payload.jti

      await this.ensureConnected()
      const redisKey = `${REDIS_REFRESH_TOKEN_PREFIX}:${userId}:${sessionId}`
      const hashedToken = await this.redis.get(redisKey)

      if (!hashedToken) {
        throw new InvalidTokenError("Refresh token not found in storage")
      }

      const isValid = await argon2.verify(hashedToken, token)
      if (!isValid) {
        throw new InvalidTokenError("Refresh token verification failed")
      }

      return {
        userId,
        session: sessionId,
      }
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error
      }
      throw new InvalidTokenError("Invalid or expired refresh token")
    }
  }

  /**
   * Invalidates a refresh token by removing it from Redis storage.
   */
  async invalidateRefreshToken(userId: number, session: string): Promise<void> {
    await this.ensureConnected()
    const redisKey = `${REDIS_REFRESH_TOKEN_PREFIX}:${userId}:${session}`
    await this.redis.del(redisKey)
  }

  /**
   * Ensures Redis connection is established.
   */
  private async ensureConnected(): Promise<void> {
    if (!this.redis.isOpen) {
      await this.redis.connect()
    }
  }
}

export { JwtTokenService }
