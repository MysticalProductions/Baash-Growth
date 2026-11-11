import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('BaashGrowthBootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Cookie parser
  app.use(cookieParser());

  // Input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Vendor-Id'],
  });

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('BAASH GROWTH API')
    .setDescription(
      'Multi-tenant communication CRM and marketing platform API for the BAASH ecosystem. ' +
      'Supports platform administration, vendor workspaces, staff management, and multi-tenant isolation.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'BAASH GROWTH API Documentation',
    customCss: `
      .swagger-ui .topbar { background-color: #12121A; border-bottom: 2px solid #7B35E8; }
      .swagger-ui { background-color: #0A0A0F; color: #FFFFFF; }
      body { background-color: #0A0A0F; }
    `,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 BAASH GROWTH Backend API is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger OpenAPI documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
