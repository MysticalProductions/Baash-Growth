import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { VendorsModule } from './vendors/vendors.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { CustomersModule } from './customers/customers.module';
import { TagsModule } from './tags/tags.module';
import { SegmentsModule } from './segments/segments.module';
import { TemplatesModule } from './templates/templates.module';
import { ImportsModule } from './imports/imports.module';
import { WalletsModule } from './wallets/wallets.module';
import { PackagesModule } from './packages/packages.module';
import { PaymentsModule } from './payments/payments.module';
import { ProvidersModule } from './providers/providers.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    RedisModule,
    AuditModule,
    AuthModule,
    AdminModule,
    VendorsModule,
    UsersModule,
    HealthModule,
    CustomersModule,
    TagsModule,
    SegmentsModule,
    TemplatesModule,
    ImportsModule,
    WalletsModule,
    PackagesModule,
    PaymentsModule,
    ProvidersModule,
    CampaignsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
