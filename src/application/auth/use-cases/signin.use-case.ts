import type { Result } from "#application/shared/result.js"
import { failure, success } from "#application/shared/result.js"
import type { UseCase } from "#application/shared/use-case.interface.js"
import type {
  PasswordService,
  TokenService,
  UserRepository,
} from "#domain/auth/index.js"
import { InvalidCredentialsError } from "#domain/auth/index.js"
import type { AuthTokensDTO, SigninInput } from "../auth.dto.js"

/**
 * Use case for user signin operation.
 * Validates credentials and returns authentication tokens.
 */
class SigninUseCase implements UseCase<SigninInput, AuthTokensDTO> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Executes the signin operation.
   * @param input - The signin input containing email and password
   * @returns Result with tokens on success, or error on failure
   */
  async execute(input: SigninInput): Promise<Result<AuthTokensDTO>> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email)

    if (!user) {
      return failure(new InvalidCredentialsError())
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(
      input.password,
      user.password,
    )

    if (!isPasswordValid) {
      return failure(new InvalidCredentialsError())
    }

    // Generate token pair - user.id is guaranteed to exist for persisted users
    const userId = user.id
    if (userId === undefined) {
      return failure(new InvalidCredentialsError())
    }

    const tokenPair = await this.tokenService.generateTokenPair(userId)

    return success({
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
    })
  }
}

export { SigninUseCase }
