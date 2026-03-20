import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      tokenVersion: user.tokenVersion,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TTL') as any,
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_REFRESH_TTL',
      ) as any,
    });
    await this.usersService.updateRefreshToken(user.username, refresh_token);

    return { access_token, refresh_token };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findOne(payload.username);
      if (!user || user.refreshTokenHash === null) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        username: user.username,
        sub: user.id,
        tokenVersion: user.tokenVersion,
        role: user.role,
      };
      const access_token = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TTL',
        ) as any,
      });

      const new_refresh_token = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_TTL',
        ) as any,
      });
      await this.usersService.updateRefreshToken(
        user.username,
        new_refresh_token,
      );

      return { access_token, refresh_token: new_refresh_token };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(username: string, pass: string) {
    const user = await this.usersService.create(username, pass);
    const { password_hash, ...result } = user;
    return result;
  }
}
