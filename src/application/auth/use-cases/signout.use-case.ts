import type { Result } from "#application/shared/result.js"
import { failure, success } from "#application/shared/result.js"
import type { UseCase } from "#application/shared/use-case.interface.js"
import type { TokenService } from "#domain/auth/index.js"
import { InvalidTokenError } from "#domain/auth/index.js"
import type { SignoutInput } from "../auth.dto.js"

/**
 * Use case for user signout operation.
 * Verifies the refresh token and invalidates it in storage.
 */
class SignoutUseCase implements UseCase<SignoutInput, void> {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Executes the signout operation.
   * @param input - The signout input containing the refresh token
   * @returns Result with void on success, or error on failure
   */
  async execute(input: SignoutInput): Promise<Result<void>> {
    try {
      // Verify the refresh token and extract payload
      const payload = await this.tokenService.verifyRefreshToken(
        input.refreshToken,
      )

      // Invalidate the refresh token in storage
      await this.tokenService.invalidateRefreshToken(
        payload.userId,
        payload.session,
      )

      return success(undefined)
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return failure(error)
      }
      // Re-throw unexpected errors
      throw error
    }
  }
}

export { SignoutUseCase }
