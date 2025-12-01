import type { Result } from "#application/shared/result.js"
import { failure, success } from "#application/shared/result.js"
import type { UseCase } from "#application/shared/use-case.interface.js"
import type { TokenService } from "#domain/auth/index.js"
import { InvalidTokenError } from "#domain/auth/index.js"
import type { AuthTokensDTO, RefreshInput } from "../auth.dto.js"

/**
 * Use case for token refresh operation.
 * Verifies the refresh token and generates a new token pair.
 */
class RefreshTokenUseCase implements UseCase<RefreshInput, AuthTokensDTO> {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Executes the token refresh operation.
   * @param input - The refresh input containing the refresh token
   * @returns Result with new tokens on success, or error on failure
   */
  async execute(input: RefreshInput): Promise<Result<AuthTokensDTO>> {
    try {
      // Verify the refresh token and extract payload
      const payload = await this.tokenService.verifyRefreshToken(
        input.refreshToken,
      )

      // Generate new token pair with the same session
      const tokenPair = await this.tokenService.generateTokenPair(
        payload.userId,
        payload.session,
      )

      return success({
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
      })
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return failure(error)
      }
      // Re-throw unexpected errors
      throw error
    }
  }
}

export { RefreshTokenUseCase }
