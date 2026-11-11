import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('BAASH GROWTH Part 3: Credit Wallet, Packages, Transactions & Razorpay Test Payments E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now();
  const vendorAEmail = `wallet.alpha.${runId}@test.in`;
  const vendorBEmail = `wallet.beta.${runId}@test.in`;
  const adminAEmail = `admin.wallet.alpha.${runId}@test.in`;
  const adminBEmail = `admin.wallet.beta.${runId}@test.in`;

  let superAdminToken: string;
  let vendorAToken: string;
  let vendorBToken: string;
  let vendorAId: string;
  let vendorBId: string;

  let createdPackageId: string;
  let testPurchaseId: string;
  let testOrderId: string;
  let testTransactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // 1. Authenticate Super Admin
    const superAdminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@baash.in',
        password: 'Password@123',
      })
      .expect(200);

    superAdminToken = superAdminRes.body.tokens.accessToken;

    // 2. Create Vendor A
    const vendorARes = await request(app.getHttpServer())
      .post('/api/admin/vendors')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        businessName: `Wallet Alpha Club ${runId}`,
        businessEmail: vendorAEmail,
        businessPhone: '+919333333331',
        adminName: 'Alpha Wallet Admin',
        adminEmail: adminAEmail,
        adminPassword: 'Password@123',
      })
      .expect(201);

    vendorAId = vendorARes.body.vendor.id;

    // 3. Create Vendor B
    const vendorBRes = await request(app.getHttpServer())
      .post('/api/admin/vendors')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        businessName: `Wallet Beta Club ${runId}`,
        businessEmail: vendorBEmail,
        businessPhone: '+919333333332',
        adminName: 'Beta Wallet Admin',
        adminEmail: adminBEmail,
        adminPassword: 'Password@123',
      })
      .expect(201);

    vendorBId = vendorBRes.body.vendor.id;

    // 4. Authenticate Vendor A Admin
    const loginARes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminAEmail,
        password: 'Password@123',
      })
      .expect(200);

    vendorAToken = loginARes.body.tokens.accessToken;

    // 5. Authenticate Vendor B Admin
    const loginBRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminBEmail,
        password: 'Password@123',
      })
      .expect(200);

    vendorBToken = loginBRes.body.tokens.accessToken;
  });

  afterAll(async () => {
    if (vendorAId) {
      await prisma.vendor.delete({ where: { id: vendorAId } }).catch(() => {});
    }
    if (vendorBId) {
      await prisma.vendor.delete({ where: { id: vendorBId } }).catch(() => {});
    }
    await prisma.user
      .deleteMany({
        where: { email: { in: [adminAEmail, adminBEmail] } },
      })
      .catch(() => {});

    await app.close();
  });

  describe('1. Admin Credit Package Management', () => {
    it('POST /api/admin/credit-packages - creates package with dynamic GST calculation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/credit-packages')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'SMS Starter Special',
          channel: 'SMS',
          credits: 1500,
          price: 399,
          gstPercentage: 18.0,
          description: 'Special 1500 SMS promotional package',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('SMS Starter Special');
      expect(res.body.credits).toBe(1500);
      expect(res.body.price).toBe(399);
      expect(res.body.gstPercentage).toBe(18);
      expect(res.body.gstAmount).toBe(71.82); // 399 * 0.18 = 71.82
      expect(res.body.finalPrice).toBe(470.82); // 399 + 71.82 = 470.82
      createdPackageId = res.body.id;
    });

    it('PUT /api/admin/credit-packages/:id - updates package price and recomputes GST dynamically', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/admin/credit-packages/${createdPackageId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          price: 499,
          gstPercentage: 18.0,
        })
        .expect(200);

      expect(res.body.price).toBe(499);
      expect(res.body.gstAmount).toBe(89.82); // 499 * 0.18 = 89.82
      expect(res.body.finalPrice).toBe(588.82); // 499 + 89.82 = 588.82
    });

    it('GET /api/credit-packages - vendor sees active packages with calculated GST', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/credit-packages?channel=SMS')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const pkg = res.body.find((p: any) => p.id === createdPackageId);
      expect(pkg).toBeDefined();
      expect(pkg.finalPrice).toBe(588.82);
    });
  });

  describe('2. Vendor Wallets Initialization', () => {
    it('GET /api/wallets - initializes all 3 wallets with 0 balance for new vendor', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wallets')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.body.wallets).toBeDefined();
      expect(res.body.wallets.length).toBe(3); // SMS, WHATSAPP, EMAIL
      expect(res.body.summary.totalAvailable).toBe(0); // Zero balance initialization

      const channels = res.body.wallets.map((w: any) => w.channel);
      expect(channels).toContain('SMS');
      expect(channels).toContain('WHATSAPP');
      expect(channels).toContain('EMAIL');
    });

    it('GET /api/wallets/SMS - retrieves SMS wallet directly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wallets/SMS')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.body.channel).toBe('SMS');
      expect(res.body.availableCredits).toBe(0);
    });
  });

  describe('3. Purchase Flow & Razorpay Test Payment Verification', () => {
    it('POST /api/purchases - initiates purchase with tax breakdown', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/purchases')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          packageId: createdPackageId,
          notes: 'Test credit purchase for campaign',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.vendorId).toBe(vendorAId);
      expect(res.body.channel).toBe('SMS');
      expect(res.body.credits).toBe(1500);
      expect(res.body.basePrice).toBe(499);
      expect(res.body.gstAmount).toBe(89.82);
      expect(res.body.totalAmount).toBe(588.82);
      expect(res.body.status).toBe('PENDING');
      testPurchaseId = res.body.id;
    });

    it('POST /api/payments/create-order - creates payment order in test mode', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          purchaseId: testPurchaseId,
          isSimulator: true,
        })
        .expect(201);

      expect(res.body.orderId).toBeDefined();
      expect(res.body.amount).toBe(58882); // 588.82 * 100 paise
      expect(res.body.currency).toBe('INR');
      testOrderId = res.body.orderId;
    });

    it('POST /api/payments/verify - fails when signature is invalid (does not credit wallet)', async () => {
      await request(app.getHttpServer())
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          purchaseId: testPurchaseId,
          razorpayOrderId: 'order_invalid_12345',
          razorpayPaymentId: 'pay_invalid_12345',
          razorpaySignature: 'invalid_fraudulent_signature',
          isSimulator: false,
        })
        .expect(400);

      // Verify wallet was NOT credited
      const walletRes = await request(app.getHttpServer())
        .get('/api/wallets/SMS')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(walletRes.body.availableCredits).toBe(0);
    });

    it('POST /api/payments/verify - successfully verifies payment and credits wallet atomically', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          purchaseId: testPurchaseId,
          razorpayOrderId: testOrderId,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          isSimulator: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.purchase.status).toBe('COMPLETED');
      expect(res.body.wallet.availableCredits).toBe(1500); // 1500 credits added
      expect(res.body.transaction).toBeDefined();
      expect(res.body.transaction.type).toBe('PURCHASE');
      expect(res.body.transaction.direction).toBe('CREDIT');
      expect(res.body.transaction.balanceBefore).toBe(0);
      expect(res.body.transaction.balanceAfter).toBe(1500);
      testTransactionId = res.body.transaction.id;
    });

    it('POST /api/payments/verify - idempotent: duplicate request does not add credits twice', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          purchaseId: testPurchaseId,
          razorpayOrderId: testOrderId,
          razorpayPaymentId: `pay_test_duplicate`,
          isSimulator: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Verify balance is still strictly 1500 (not 3000)
      const walletRes = await request(app.getHttpServer())
        .get('/api/wallets/SMS')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(walletRes.body.availableCredits).toBe(1500);
    });

    it('GET /api/transactions - vendor views immutable ledger entry', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions?channel=SMS')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      const tx = res.body.data.find((t: any) => t.id === testTransactionId);
      expect(tx).toBeDefined();
      expect(tx.credits).toBe(1500);
      expect(tx.balanceAfter).toBe(1500);
    });
  });

  describe('4. Manual Admin Adjustment & Non-Negative Balance Rule', () => {
    it('POST /api/admin/wallets/adjust - forbids debit exceeding available balance', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/wallets/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vendorId: vendorAId,
          channel: 'SMS',
          quantity: 2500, // Available is 1500
          action: 'DEBIT',
          reason: 'Excessive debit adjustment attempt',
        })
        .expect(400);

      expect(res.body.message).toContain('Negative balances are strictly forbidden');
    });

    it('POST /api/admin/wallets/adjust - requires mandatory reason', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/wallets/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vendorId: vendorAId,
          channel: 'SMS',
          quantity: 200,
          action: 'DEBIT',
          reason: ' ', // Empty reason
        })
        .expect(400);
    });

    it('POST /api/admin/wallets/adjust - successfully debits credits and creates audit log', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/wallets/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vendorId: vendorAId,
          channel: 'SMS',
          quantity: 500,
          action: 'DEBIT',
          reason: 'Administrative test credit clawback after verification',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.wallet.balanceBefore).toBe(1500);
      expect(res.body.wallet.balanceAfter).toBe(1000);
      expect(res.body.auditLog).toBeDefined();
      expect(res.body.auditLog.reason).toBe(
        'Administrative test credit clawback after verification',
      );
    });
  });

  describe('5. Multi-Tenant Wallet & Transaction Isolation', () => {
    it('Vendor B cannot access Vendor A wallet balance or transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wallets')
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(200);

      // Vendor B must have 0 credits in their own isolated wallet
      expect(res.body.summary.totalAvailable).toBe(0);
    });

    it('Vendor B cannot access Vendor A specific transaction details', async () => {
      await request(app.getHttpServer())
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(404); // Returns 404 to avoid leaking transaction existence
    });

    it('Vendor B cannot access Vendor A purchase order', async () => {
      await request(app.getHttpServer())
        .get(`/api/purchases/${testPurchaseId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(404);
    });
  });

  describe('6. Admin Global Wallet Reports', () => {
    it('GET /api/admin/wallets - admin can inspect all vendor balances', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/wallets')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.vendors).toBeDefined();
      const vendorAEntry = res.body.vendors.find((v: any) => v.id === vendorAId);
      expect(vendorAEntry).toBeDefined();
      expect(vendorAEntry.balances.sms).toBe(1000);
    });

    it('GET /api/admin/wallet-reports - returns aggregated financial and credit metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/wallet-reports')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalRevenue).toBeGreaterThanOrEqual(588.82);
      expect(res.body.summary.totalCreditsSold).toBeGreaterThanOrEqual(1500);
      expect(res.body.channelBreakdown.SMS.creditsSold).toBeGreaterThanOrEqual(1500);
    });
  });
});

