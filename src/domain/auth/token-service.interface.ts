/**
 * Payload contained within JWT tokens
 */
interface TokenPayload {
  userId: number
  session: string
}

/**
 * A pair of access and refresh tokens
 */
interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Service interface for JWT token operations.
 * Defines the contract for token generation, verification, and invalidation.
 */
interface TokenService {
  /**
   * Generates a new pair of access and refresh tokens.
   * @param userId - The user's unique identifier
   * @param session - Optional session identifier (KSUID), generated if not provided
   * @returns A promise resolving to the token pair
   */
  generateTokenPair(userId: number, session?: string): Promise<TokenPair>

  /**
   * Verifies an access token and extracts its payload.
   * @param token - The access token to verify
   * @returns The token payload if valid
   * @throws InvalidTokenError if token is invalid or expired
   */
  verifyAccessToken(token: string): TokenPayload

  /**
   * Verifies a refresh token against Redis storage.
   * @param token - The refresh token to verify
   * @returns A promise resolving to the token payload if valid
   * @throws InvalidTokenError if token is invalid, expired, or not in storage
   */
  verifyRefreshToken(token: string): Promise<TokenPayload>

  /**
   * Invalidates a refresh token by removing it from Redis storage.
   * @param userId - The user's unique identifier
   * @param session - The session identifier to invalidate
   */
  invalidateRefreshToken(userId: number, session: string): Promise<void>
}

export type { TokenPair, TokenPayload, TokenService }
