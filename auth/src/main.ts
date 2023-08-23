import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Auth');

  const app = await NestFactory.createMicroservice(AuthModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_HOST || 'localhost',
      port: process.env.AUTH_PORT || 3004,
    },
  });
  await app
    .listen()
    .then(() =>
      logger.log(
        `🔑 Auth Service is running on port ${
          process.env.AUTH_HOST || 'localhost'
        }:${process.env.AUTH_PORT || 3004}`
      )
    );
}
bootstrap();
