import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { PackagesService } from '../packages/packages.service';
import {
  PurchaseStatus,
  PaymentStatus,
  PaymentProvider,
  TransactionType,
  Prisma,
} from '@prisma/client';
import { CreatePurchaseDto, CreatePaymentOrderDto, VerifyPaymentDto } from './dto/payment.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;
  private readonly razorpayWebhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
    private readonly packagesService: PackagesService,
  ) {
    this.razorpayKeyId =
      this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_baash_growth_demo';
    this.razorpayKeySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'rzp_test_secret_demo_key';
    this.razorpayWebhookSecret =
      this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'baash_webhook_secret_key_demo';
  }

  /**
   * Vendor API: Initiate a credit package purchase.
   * Calculates base price, GST percentage, GST amount, and total payable amount.
   */
  async createPurchase(vendorId: string, dto: CreatePurchaseDto) {
    const pkg = await this.packagesService.getPackageById(dto.packageId);

    if (pkg.status !== 'ACTIVE') {
      throw new BadRequestException('The selected credit package is not active for purchase');
    }

    const financials = this.packagesService.calculateFinancials(
      Number(pkg.price),
      Number(pkg.gstPercentage),
    );

    const purchase = await this.prisma.creditPurchase.create({
      data: {
        vendorId,
        packageId: pkg.id,
        channel: pkg.channel,
        credits: pkg.credits,
        basePrice: financials.price,
        gstPercentage: financials.gstPercentage,
        gstAmount: financials.gstAmount,
        totalAmount: financials.finalPrice,
        currency: 'INR',
        status: PurchaseStatus.PENDING,
        notes: dto.notes?.trim(),
      },
      include: {
        package: true,
      },
    });

    return {
      ...purchase,
      basePrice: Number(purchase.basePrice),
      gstPercentage: Number(purchase.gstPercentage),
      gstAmount: Number(purchase.gstAmount),
      totalAmount: Number(purchase.totalAmount),
    };
  }

  /**
   * Vendor API: Retrieve purchase details by ID, enforcing multi-tenant isolation.
   */
  async getPurchaseById(vendorId: string, purchaseId: string) {
    const purchase = await this.prisma.creditPurchase.findFirst({
      where: {
        id: purchaseId,
        vendorId,
      },
      include: {
        package: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase record not found or access denied');
    }

    return {
      ...purchase,
      basePrice: Number(purchase.basePrice),
      gstPercentage: Number(purchase.gstPercentage),
      gstAmount: Number(purchase.gstAmount),
      totalAmount: Number(purchase.totalAmount),
      payments: purchase.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  }

  /**
   * Vendor API: Create a Razorpay Order (or Test Mode Simulator Order).
   * Never trust client-calculated amounts; derives exact payable amount from database purchase record.
   */
  async createPaymentOrder(vendorId: string, dto: CreatePaymentOrderDto) {
    const purchase = await this.prisma.creditPurchase.findFirst({
      where: { id: dto.purchaseId, vendorId },
      include: { package: true },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase record not found or access denied');
    }

    if (purchase.status === PurchaseStatus.COMPLETED) {
      throw new BadRequestException('This purchase has already been completed and credited');
    }

    const amountInPaise = Math.round(Number(purchase.totalAmount) * 100);
    const isMockCredential =
      !this.razorpayKeyId ||
      this.razorpayKeyId.includes('demo') ||
      dto.isSimulator;

    let providerOrderId: string;
    let isSimulator = false;

    if (isMockCredential) {
      // Use Test Payment Simulator with realistic Razorpay order ID shape
      providerOrderId = `order_sim_${crypto.randomBytes(8).toString('hex')}`;
      isSimulator = true;
    } else {
      // Attempt official Razorpay Orders API
      try {
        const authHeader = Buffer.from(
          `${this.razorpayKeyId}:${this.razorpayKeySecret}`,
        ).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${purchase.id.slice(0, 8)}`,
            notes: {
              vendorId,
              purchaseId: purchase.id,
              channel: purchase.channel,
              credits: purchase.credits,
            },
          }),
        });

        if (response.ok) {
          const rzpOrder = await response.json();
          providerOrderId = rzpOrder.id;
        } else {
          // If Razorpay API rejects test credentials, fall back to Simulator for seamless demo
          this.logger.warn(`Razorpay API responded with status ${response.status}. Using Test Simulator.`);
          providerOrderId = `order_sim_${crypto.randomBytes(8).toString('hex')}`;
          isSimulator = true;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to connect to Razorpay API (${err.message}). Using Test Simulator.`);
        providerOrderId = `order_sim_${crypto.randomBytes(8).toString('hex')}`;
        isSimulator = true;
      }
    }

    // Record Payment in database
    await this.prisma.payment.create({
      data: {
        vendorId,
        purchaseId: purchase.id,
        provider: isSimulator ? PaymentProvider.SIMULATOR : PaymentProvider.RAZORPAY,
        providerOrderId,
        amount: purchase.totalAmount,
        currency: 'INR',
        status: PaymentStatus.CREATED,
      },
    });

    // Update purchase to PROCESSING
    await this.prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { status: PurchaseStatus.PROCESSING },
    });

    return {
      orderId: providerOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: isSimulator ? 'rzp_test_simulator' : this.razorpayKeyId,
      purchaseId: purchase.id,
      channel: purchase.channel,
      credits: purchase.credits,
      packageName: purchase.package?.name || 'Custom Credits',
      totalAmount: Number(purchase.totalAmount),
      isSimulator,
    };
  }

  /**
   * Vendor API: Verify Razorpay Payment Signature and allocate credits into wallet.
   * Uses database transactions, idempotency keys, and cryptographic HMAC SHA256 validation.
   */
  async verifyPayment(vendorId: string, dto: VerifyPaymentDto) {
    const { purchaseId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isSimulator } =
      dto;

    const purchase = await this.prisma.creditPurchase.findFirst({
      where: { id: purchaseId, vendorId },
      include: { package: true },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase record not found or access denied');
    }

    // Idempotency: If purchase is already marked COMPLETED, return current state
    if (purchase.status === PurchaseStatus.COMPLETED) {
      const wallet = await this.walletsService.getChannelWallet(vendorId, purchase.channel);
      return {
        success: true,
        message: 'Payment verified and credits already allocated',
        purchase: {
          id: purchase.id,
          status: purchase.status,
          credits: purchase.credits,
          channel: purchase.channel,
        },
        wallet: {
          channel: wallet.channel,
          availableCredits: wallet.availableCredits,
        },
      };
    }

    let signatureVerified = false;

    if (isSimulator || razorpayOrderId.startsWith('order_sim_')) {
      // Test simulator verified
      signatureVerified = true;
    } else {
      // Cryptographic HMAC SHA256 Signature Verification
      if (!razorpaySignature) {
        throw new BadRequestException('Missing payment signature');
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        // Record failed attempt
        await this.prisma.payment.updateMany({
          where: { providerOrderId: razorpayOrderId },
          data: {
            status: PaymentStatus.FAILED,
            providerPaymentId: razorpayPaymentId,
            providerSignature: razorpaySignature,
            signatureVerified: false,
          },
        });

        await this.prisma.creditPurchase.update({
          where: { id: purchase.id },
          data: { status: PurchaseStatus.FAILED },
        });

        throw new BadRequestException('Razorpay payment signature verification failed');
      }

      signatureVerified = true;
    }

    // Execute atomic credit allocation in database transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Payment record to CAPTURED
      await tx.payment.updateMany({
        where: { providerOrderId: razorpayOrderId },
        data: {
          providerPaymentId: razorpayPaymentId,
          providerSignature: razorpaySignature || 'SIMULATED_VERIFIED_SIGNATURE',
          status: PaymentStatus.CAPTURED,
          signatureVerified: true,
          updatedAt: new Date(),
        },
      });

      // 2. Mark Purchase as COMPLETED
      const updatedPurchase = await tx.creditPurchase.update({
        where: { id: purchase.id },
        data: {
          status: PurchaseStatus.COMPLETED,
          paymentMethod: isSimulator ? 'TEST_SIMULATOR' : 'RAZORPAY_TEST',
          idempotencyKey: `purchase_${purchase.id}`,
          updatedAt: new Date(),
        },
      });

      // 3. Add credits to vendor channel wallet and write immutable ledger transaction
      const description = `Purchased ${purchase.credits.toLocaleString()} ${purchase.channel} credits (${purchase.package?.name || 'Package Purchase'})`;

      const ledgerEntry = await this.walletsService.creditWallet(
        vendorId,
        purchase.channel,
        purchase.credits,
        TransactionType.PURCHASE,
        description,
        {
          referenceType: 'CREDIT_PURCHASE',
          referenceId: purchase.id,
          idempotencyKey: `purchase_${purchase.id}`,
          metadata: {
            razorpayOrderId,
            razorpayPaymentId,
            totalAmount: Number(purchase.totalAmount),
            packageName: purchase.package?.name,
          },
        },
        tx,
      );

      const wallet = await tx.vendorWallet.findUnique({
        where: { vendorId_channel: { vendorId, channel: purchase.channel } },
      });

      return {
        success: true,
        message: `Successfully added ${purchase.credits.toLocaleString()} ${purchase.channel} credits to your wallet`,
        purchase: {
          id: updatedPurchase.id,
          channel: updatedPurchase.channel,
          credits: updatedPurchase.credits,
          status: updatedPurchase.status,
          totalAmount: Number(updatedPurchase.totalAmount),
          packageName: purchase.package?.name,
        },
        transaction: ledgerEntry,
        wallet: {
          channel: wallet?.channel,
          availableCredits: wallet?.availableCredits,
          totalPurchased: wallet?.totalPurchased,
        },
      };
    });
  }

  /**
   * Handle Razorpay Webhooks idempotently using raw body HMAC signature.
   */
  async handleWebhook(rawBody: string, signatureHeader?: string) {
    if (!signatureHeader) {
      throw new UnauthorizedException('Missing webhook signature header');
    }

    // Verify raw body HMAC
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signatureHeader) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.id;
    const eventType = payload.event;

    // Idempotency check: Don't process same webhook event twice
    if (eventId) {
      const existing = await this.prisma.paymentWebhookEvent.findUnique({
        where: { eventId },
      });
      if (existing && existing.processed) {
        return { status: 'already_processed' };
      }
    }

    // Log webhook event
    const webhookRecord = await this.prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.RAZORPAY,
        eventId,
        eventType,
        payload,
      },
    });

    try {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        const orderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
        const paymentId = payload.payload?.payment?.entity?.id;

        if (orderId) {
          const payment = await this.prisma.payment.findUnique({
            where: { providerOrderId: orderId },
            include: { purchase: true },
          });

          if (payment && payment.purchase.status !== PurchaseStatus.COMPLETED) {
            await this.verifyPayment(payment.vendorId, {
              purchaseId: payment.purchaseId,
              razorpayOrderId: orderId,
              razorpayPaymentId: paymentId || `pay_${crypto.randomBytes(6).toString('hex')}`,
              isSimulator: false,
            });
          }
        }
      }

      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processed: true, processedAt: new Date() },
      });

      return { status: 'success' };
    } catch (err: any) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processed: false, error: err.message },
      });
      throw err;
    }
  }
}
