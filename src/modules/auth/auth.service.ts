import argon2 from "argon2"
import bcrypt from "bcrypt"
import jwt, { type JwtPayload } from "jsonwebtoken"
import KSUID from "ksuid"

import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "#core/errors/base.error.js"
import { Service } from "#infrastructures/base/service.base.js"
import { env } from "#infrastructures/config/env.config.js"
import { SigninInput, SignupInput } from "./auth.schema.js"

const REFRESH_TOKEN_EXPIRES_IN = "7d"
const ACCESS_TOKEN_EXPIRES_IN = "15m"
const REDIS_REFRESH_TOKEN_PREFIX = "refresh_token"
const REDIS_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7

interface GenerateTokenOptions {
  userId: number
  type: "access" | "refresh"
  session?: string
}

class AuthService extends Service {
  /**
   * Generate a JWT token for the given user ID.
   *
   * @param userId - The ID of the user to generate the token for.
   * @param type - The type of token to generate ("access" or "refresh").
   * @param session - An optional session ID to include in the token.
   * @returns A promise that resolves to the generated JWT token.
   */
  async generateToken({ userId, type, session }: GenerateTokenOptions) {
    const ksuid = await KSUID.random()
    const sessionId = session ?? ksuid.string

    const payload = {
      sub: userId,
      jti: sessionId,
    }

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn:
        type === "access" ? ACCESS_TOKEN_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN,
    })

    if (type === "refresh") {
      await this.redis.connect()

      const redisId = `${REDIS_REFRESH_TOKEN_PREFIX}:${userId}:${sessionId}`
      const hashedToken = await argon2.hash(token)

      await this.redis.set(redisId, hashedToken, {
        EX: REDIS_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      })

      this.redis.destroy()
    }

    return token
  }

  /**
   * Verify the given access token and return the user ID if valid.
   *
   * @param token - The access token to verify.
   * @returns The user ID if the token is valid.
   * @throws {UnauthorizedError} If the token is invalid.
   */
  verifyAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
      return payload
    } catch {
      throw new UnauthorizedError("Invalid access token")
    }
  }

  /**
   * Verify the given refresh token and return the user ID if valid.
   *
   * @param token - The refresh token to verify.
   * @returns The user ID if the token is valid.
   * @throws {UnauthorizedError} If the token is invalid.
   */
  async verifyRefreshToken(token: string) {
    try {
      await this.redis.connect()

      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
      const identifier = `${REDIS_REFRESH_TOKEN_PREFIX}:${payload.sub}:${payload.jti}`

      const hashedToken = await this.redis.get(identifier)

      if (!hashedToken) {
        throw new UnauthorizedError("Invalid refresh token")
      }

      const isTokenValid = await argon2.verify(hashedToken, token)

      if (!isTokenValid) {
        throw new UnauthorizedError("Invalid refresh token")
      }

      return payload
    } catch {
      throw new UnauthorizedError("Invalid refresh token")
    }
  }

  /**
   * Authenticate a user with the given email and password.
   *
   * @param email - The email of the user to authenticate.
   * @param password - The password of the user to authenticate.
   * @returns A promise that resolves to the authenticated user.
   * @throws {NotFoundError} If the user with the given email is not found.
   * @throws {BadRequestError} If the password is incorrect.
   */
  async signin({ email, password }: SigninInput) {
    const user = await this.db
      .selectFrom("users")
      .where("email", "=", email)
      .select(["id", "password"])
      .executeTakeFirst()

    if (!user) {
      throw new NotFoundError("User not found")
    }

    const laravelHash = user.password.replace(/^\$2y/, "$2b")

    // TODO: Legacy hashing method, should be changed to argon2 in the future after all features were migrated
    const isPasswordCorrect = await bcrypt.compare(password, laravelHash)

    if (!isPasswordCorrect) {
      throw new BadRequestError("Incorrect password")
    }

    return user.id
  }

  /**
   * Register a new user with the given email and password.
   *
   * @param name - The name of the user to register.
   * @param email - The email of the user to register.
   * @param password - The password of the user to register.
   * @returns A promise that resolves to the registered user.
   * @throws {BadRequestError} If the user with the given email already exists or if the password is empty.
   */
  async signup({ name, email, password }: SignupInput) {
    const nodeHash = await bcrypt.hash(password, 12)
    const laravelCompatible = nodeHash.replace(/^\$2[ab]\$/, "$2y$")

    const result = await this.db
      .insertInto("users")
      .values({
        name,
        email,
        password: laravelCompatible,
      })
      .executeTakeFirst()

    if (!result.insertId) {
      throw new Error("Insert failed")
    }

    const user = await this.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", Number(result.insertId))
      .executeTakeFirst()

    if (!user) {
      throw new BadRequestError("Failed to create user")
    }

    return user.id
  }

  /**
   * Sign out the user with the given refresh token.
   *
   * @param token - The refresh token of the user to sign out.
   * @returns A promise that resolves when the user is signed out.
   * @throws {UnauthorizedError} If the token is invalid.
   */
  async signout(token: string) {
    await this.redis.connect()

    const payload = this.verifyRefreshToken(token) as JwtPayload
    const redisId = `${REDIS_REFRESH_TOKEN_PREFIX}:${payload.sub}:${payload.jti}`
    await this.redis.del(redisId)

    this.redis.destroy()
  }
}

export { AuthService }
