import { Controller } from "#infrastructures/base/controller.base.js"
import type { Request, Response } from "express"
import {
  RefreshInput,
  refreshSchema,
  SigninInput,
  signinSchema,
  SignoutInput,
  SignupInput,
  signupSchema,
} from "./auth.schema.js"
import { AuthService } from "./auth.service.js"

class AuthController extends Controller {
  private readonly authService = new AuthService()

  constructor() {
    super()
    this.bindRoutes([
      {
        method: "post",
        path: "/signin",
        handler: this.signin,
        schema: signinSchema,
      },
      {
        method: "post",
        path: "/signup",
        handler: this.signUp,
        schema: signupSchema,
      },
      {
        method: "post",
        path: "/refresh",
        handler: this.refresh,
        schema: refreshSchema,
      },
    ])
  }

  private async signin(req: Request, res: Response) {
    const data = req.validated as SigninInput
    const userId = await this.authService.signin(data)

    const response = {
      access_token: await this.authService.generateToken({
        userId,
        type: "access",
      }),
      refresh_token: await this.authService.generateToken({
        userId,
        type: "refresh",
      }),
    }

    res.json(response).send()
  }

  private async signUp(req: Request, res: Response) {
    const data = req.validated as SignupInput
    const userId = await this.authService.signup(data)

    const response = {
      access_token: await this.authService.generateToken({
        userId,
        type: "access",
      }),
      refresh_token: await this.authService.generateToken({
        userId,
        type: "refresh",
      }),
    }

    res.json(response).send()
  }

  private async refresh(req: Request, res: Response) {
    const data = req.validated as RefreshInput
    const payload = await this.authService.verifyRefreshToken(
      data.refresh_token,
    )

    const response = {
      access_token: await this.authService.generateToken({
        userId: payload.userId,
        type: "access",
        session: payload.session,
      }),
      refresh_token: await this.authService.generateToken({
        userId: payload.userId,
        type: "refresh",
        session: payload.session,
      }),
    }

    res.json(response).send()
  }

  private async signout(req: Request, res: Response) {
    const data = req.validated as SignoutInput
    await this.authService.signout(data.refresh_token)

    res.status(204).send()
  }
}

export { AuthController }
