import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePurchaseDto, CreatePaymentOrderDto, VerifyPaymentDto } from './dto/payment.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Credit Purchases & Orders')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Initiate a credit package purchase order' })
  async createPurchase(
    @CurrentTenant() vendorId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.paymentsService.createPurchase(vendorId, dto);
  }

  @Get(':id')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get purchase details, billing summary, and payment status' })
  async getPurchaseById(
    @CurrentTenant() vendorId: string,
    @Param('id') purchaseId: string,
  ) {
    return this.paymentsService.getPurchaseById(vendorId, purchaseId);
  }
}

@ApiTags('Razorpay Test Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Create Razorpay or Test Simulator payment order for a pending purchase' })
  async createPaymentOrder(
    @CurrentTenant() vendorId: string,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.paymentsService.createPaymentOrder(vendorId, dto);
  }

  @Post('verify')
  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Verify Razorpay payment signature and credit vendor wallet' })
  async verifyPayment(
    @CurrentTenant() vendorId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(vendorId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay webhook callback endpoint with raw body signature verification' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}
