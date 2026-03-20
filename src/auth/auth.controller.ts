import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Res,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { Response } from 'express';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../users/user.entity';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(req.user);
    res.cookie('refreshToken', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { access_token: tokens.access_token };
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.usersService.incrementTokenVersion(req.user.username);
    await this.usersService.removeRefreshToken(req.user.username);
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refresh(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    res.cookie('refreshToken', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { access_token: tokens.access_token };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  async adminOnly(@Request() req: any) {
    return { message: 'Welcome Admin!', user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.usersService.findOne(req.user.username);
    const { password_hash, refreshTokenHash, ...result } = user as any;
    return result;
  }
}
