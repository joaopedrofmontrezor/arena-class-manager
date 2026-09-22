import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; 

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.login(dto.email, dto.password);

   
    res.cookie(COOKIE_NAME, accessToken, cookieOptions());

    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    return { ok: true };
  }

  
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user) {
    return { id: user.userId, name: user.name, role: user.role };
  }
}
