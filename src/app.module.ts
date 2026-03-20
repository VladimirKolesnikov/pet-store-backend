import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MinioModule } from './minio/minio.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { getTypeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getTypeOrmConfig,
      inject: [ConfigService],
    }),
    MinioModule,
  ],
})
export class AppModule {}
