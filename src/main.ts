import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGINS ??
    'https://billstracker.online,http://localhost:8080,http://localhost:3000,http://192.168.0.102:8080')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📱 Access from phone: http://192.168.0.102:${port}`);
}
bootstrap();

