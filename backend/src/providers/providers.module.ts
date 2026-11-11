import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { Msg91SmsProvider } from './sms/msg91.provider';
import { MetaWhatsAppProvider } from './whatsapp/meta.provider';
import { AmazonSesEmailProvider } from './email/ses.provider';
import { AdminProvidersController } from './admin-providers.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminProvidersController],
  providers: [
    ProvidersService,
    Msg91SmsProvider,
    MetaWhatsAppProvider,
    AmazonSesEmailProvider,
  ],
  exports: [ProvidersService, Msg91SmsProvider, MetaWhatsAppProvider, AmazonSesEmailProvider],
})
export class ProvidersModule {}
