import type { Request, Response } from "express"

import type {
  RefreshTokenUseCase,
  SigninUseCase,
  SignoutUseCase,
  SignupUseCase,
} from "#application/auth/use-cases/index.js"

import { Controller } from "#presentation/shared/index.js"
import type {
  RefreshSchemaInput,
  SigninSchemaInput,
  SignoutSchemaInput,
  SignupSchemaInput,
} from "./auth.schema.js"
import {
  refreshSchema,
  signinSchema,
  signoutSchema,
  signupSchema,
} from "./auth.schema.js"

/**
 * Presentation layer controller for Auth operations.
 * Uses use cases for business logic and handles HTTP concerns.
 *
 * **Feature: auth-clean-architecture**
 * **Validates: Requirements 5.1, 5.2, 5.4**
 */
class AuthController extends Controller {
  constructor(
    private readonly signinUseCase: SigninUseCase,
    private readonly signupUseCase: SignupUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly signoutUseCase: SignoutUseCase,
  ) {
    super()

    this.bindRoutes([
      {
        handler: this.signin,
        method: "post",
        path: "/signin",
        schema: signinSchema,
      },
      {
        handler: this.signup,
        method: "post",
        path: "/signup",
        schema: signupSchema,
      },
      {
        handler: this.refresh,
        method: "post",
        path: "/refresh",
        schema: refreshSchema,
      },
      {
        handler: this.signout,
        method: "post",
        path: "/signout",
        schema: signoutSchema,
      },
    ])
  }

  /**
   * Handles user signin.
   * Uses SigninUseCase.
   */
  private signin = async (req: Request, res: Response) => {
    const data = req.validated as SigninSchemaInput
    const result = await this.signinUseCase.execute({
      email: data.email,
      password: data.password,
    })
    this.handleResult(res, result)
  }

  /**
   * Handles user signup.
   * Uses SignupUseCase.
   */
  private signup = async (req: Request, res: Response) => {
    const data = req.validated as SignupSchemaInput
    const result = await this.signupUseCase.execute({
      name: data.name,
      email: data.email,
      password: data.password,
    })
    this.handleResult(res, result, 201)
  }

  /**
   * Handles token refresh.
   * Uses RefreshTokenUseCase.
   */
  private refresh = async (req: Request, res: Response) => {
    const data = req.validated as RefreshSchemaInput
    const result = await this.refreshTokenUseCase.execute({
      refreshToken: data.refresh_token,
    })
    this.handleResult(res, result)
  }

  /**
   * Handles user signout.
   * Uses SignoutUseCase.
   */
  private signout = async (req: Request, res: Response) => {
    const data = req.validated as SignoutSchemaInput
    const result = await this.signoutUseCase.execute({
      refreshToken: data.refresh_token,
    })

    if (result.success) {
      res.status(204).send()
    } else if (result.error) {
      this.handleError(res, result.error)
    }
  }
}

export { AuthController }
