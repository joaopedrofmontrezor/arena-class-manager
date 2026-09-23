import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";

import { AuthService } from "./auth.service";
import {
  CurrentUser,
  CurrentUserData,
} from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "./csrf";

const COOKIE_NAME = "token";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

function csrfCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: false,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.login(
      dto.email,
      dto.password,
    );

    const csrfToken = generateCsrfToken();

    res.cookie(COOKIE_NAME, accessToken, cookieOptions());

    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());

    return { user };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, {
      ...cookieOptions(),
      maxAge: undefined,
    });

    res.clearCookie(CSRF_COOKIE_NAME, {
      ...csrfCookieOptions(),
      maxAge: undefined,
    });

    return { ok: true };
  }

  @Get("csrf")
  @UseGuards(AuthGuard("jwt"))
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = generateCsrfToken();

    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());

    return { ok: true };
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  me(@CurrentUser() user: CurrentUserData) {
    return { id: user.userId, name: user.name, role: user.role };
  }
}
