import { Controller, Post, Get, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Inbound Communication Webhooks (DLR & Delivery Reports)')
@Public()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('msg91')
  @ApiOperation({ summary: 'MSG91 SMS DLR status callback' })
  async msg91Webhook(@Body() payload: any) {
    return this.webhooksService.processMsg91Dlr(payload);
  }

  @Get('whatsapp')
  @ApiOperation({ summary: 'Meta WhatsApp Webhook subscription verification endpoint' })
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'baash_whatsapp_webhook_verify_token';
    if (mode === 'subscribe' && token === expectedToken) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Meta WhatsApp Cloud API inbound status updates (delivered, read, failed)' })
  async whatsappWebhook(@Body() payload: any) {
    return this.webhooksService.processWhatsAppStatus(payload);
  }

  @Post('ses')
  @ApiOperation({ summary: 'Amazon SES SNS event notifications (delivery, bounce, complaint)' })
  async sesWebhook(@Body() payload: any) {
    return this.webhooksService.processSesNotification(payload);
  }
}
