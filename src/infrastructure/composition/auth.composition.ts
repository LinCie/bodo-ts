import type { Kysely } from "kysely"
import type { RedisClientType } from "redis"

import type { DB } from "#infrastructure/database/index.js"

import {
  RefreshTokenUseCase,
  SigninUseCase,
  SignoutUseCase,
  SignupUseCase,
} from "#application/auth/use-cases/index.js"
import {
  BcryptPasswordService,
  JwtTokenService,
} from "#infrastructure/auth/index.js"
import { redis } from "#infrastructure/caching/index.js"
import { env } from "#infrastructure/config/index.js"
import { db } from "#infrastructure/database/index.js"
import { KyselyUserRepository } from "#infrastructure/persistence/index.js"
import { AuthController } from "#presentation/auth/index.js"

/**
 * Composition root for the Auth module.
 * Creates and wires all dependencies for the Auth feature.
 *
 * This factory function implements the Composition Root pattern,
 * ensuring all dependencies are composed at the application entry point.
 *
 * **Feature: auth-clean-architecture**
 * **Validates: Requirements 6.1, 6.2**
 */
function composeAuthModule(
  database: Kysely<DB> = db,
  redisClient: RedisClientType = redis,
  jwtSecret: string = env.JWT_SECRET,
): AuthController {
  // Infrastructure layer - Services and Repository
  const passwordService = new BcryptPasswordService()
  const tokenService = new JwtTokenService(redisClient, jwtSecret)
  const userRepository = new KyselyUserRepository(database)

  // Application layer - Use Cases
  const signinUseCase = new SigninUseCase(
    userRepository,
    tokenService,
    passwordService,
  )
  const signupUseCase = new SignupUseCase(
    userRepository,
    tokenService,
    passwordService,
  )
  const refreshTokenUseCase = new RefreshTokenUseCase(tokenService)
  const signoutUseCase = new SignoutUseCase(tokenService)

  // Presentation layer - Controller
  const authController = new AuthController(
    signinUseCase,
    signupUseCase,
    refreshTokenUseCase,
    signoutUseCase,
  )

  return authController
}

export { composeAuthModule }
