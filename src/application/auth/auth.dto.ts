/**
 * Input DTO for user signin operation.
 */
interface SigninInput {
  email: string
  password: string
}

/**
 * Input DTO for user signup operation.
 */
interface SignupInput {
  name: string
  email: string
  password: string
}

/**
 * Input DTO for token refresh operation.
 */
interface RefreshInput {
  refreshToken: string
}

/**
 * Input DTO for signout operation.
 */
interface SignoutInput {
  refreshToken: string
}

/**
 * Output DTO containing authentication tokens.
 */
interface AuthTokensDTO {
  access_token: string
  refresh_token: string
}

/**
 * Output DTO for user data (excludes password).
 */
interface UserDTO {
  id: number
  name: string
  email: string
}

export type {
  AuthTokensDTO,
  RefreshInput,
  SigninInput,
  SignoutInput,
  SignupInput,
  UserDTO,
}
