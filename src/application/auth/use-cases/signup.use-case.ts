import type { Result } from "#application/shared/result.js"
import { failure, success } from "#application/shared/result.js"
import type { UseCase } from "#application/shared/use-case.interface.js"
import type {
  PasswordService,
  TokenService,
  UserRepository,
} from "#domain/auth/index.js"
import { User, UserAlreadyExistsError } from "#domain/auth/index.js"
import { ValidationError } from "#domain/shared/errors/index.js"
import type { AuthTokensDTO, SignupInput } from "../auth.dto.js"

/**
 * Use case for user signup operation.
 * Creates a new user and returns authentication tokens.
 */
class SignupUseCase implements UseCase<SignupInput, AuthTokensDTO> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Executes the signup operation.
   * @param input - The signup input containing name, email, and password
   * @returns Result with tokens on success, or error on failure
   */
  async execute(input: SignupInput): Promise<Result<AuthTokensDTO>> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(input.email)

    if (existingUser) {
      return failure(new UserAlreadyExistsError(input.email))
    }

    // Hash the password
    const hashedPassword = await this.passwordService.hash(input.password)

    // Create User entity (validates input)
    let user: User
    try {
      user = User.create({
        name: input.name,
        email: input.email,
        password: hashedPassword,
      })
    } catch (error) {
      if (error instanceof ValidationError) {
        return failure(error)
      }
      throw error
    }

    // Save user to repository
    const savedUser = await this.userRepository.save(user)

    // Get user ID - guaranteed to exist after save
    const userId = savedUser.id
    if (userId === undefined) {
      return failure(new ValidationError(["Failed to create user"]))
    }

    // Generate token pair
    const tokenPair = await this.tokenService.generateTokenPair(userId)

    return success({
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
    })
  }
}

export { SignupUseCase }
