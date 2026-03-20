import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(username: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      return undefined;
    }
    return user;
  }

  async create(username: string, passwordPlain: string): Promise<User> {
    const saltOrRounds = 10;
    const password_hash = await bcrypt.hash(passwordPlain, saltOrRounds);

    const user = this.usersRepository.create({
      username,
      password_hash,
      tokenVersion: 0,
      role: Role.CUSTOMER,
    });

    return await this.usersRepository.save(user);
  }

  async incrementTokenVersion(username: string): Promise<void> {
    const user = await this.findOne(username);
    if (user) {
      user.tokenVersion += 1;
      await this.usersRepository.save(user);
    }
  }

  async updateRefreshToken(
    username: string,
    refreshToken: string,
  ): Promise<void> {
    const user = await this.findOne(username);
    if (user) {
      user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      await this.usersRepository.save(user);
    }
  }

  async removeRefreshToken(username: string): Promise<void> {
    const user = await this.findOne(username);
    if (user) {
      user.refreshTokenHash = null; // Also handle the case where it might be undefined depending on DB schema
      await this.usersRepository.save(user);
    }
  }
}
