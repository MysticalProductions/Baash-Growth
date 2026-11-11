import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('BAASH GROWTH Part 5: Final QA, Security, Analytics & Production Readiness', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now();
  const vendorAlphaEmail = `qa.alpha.${runId}@test.in`;
  const vendorBetaEmail = `qa.beta.${runId}@test.in`;
  const adminAlphaEmail = `qa.admin.alpha.${runId}@test.in`;
  const adminBetaEmail = `qa.admin.beta.${runId}@test.in`;

  let superAdminToken: string;
  let vendorAlphaToken: string;
  let vendorBetaToken: string;
  let vendorAlphaId: string;
  let vendorBetaId: string;
  let vendorAlphaCustomerId: string;

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
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@baash.in',
        password: 'BaashAdmin@2026',
      });
    superAdminToken = adminLoginRes.body.data?.accessToken;

    // 2. Provision Vendor Alpha
    const alphaRes = await request(app.getHttpServer())
      .post('/api/admin/vendors')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        businessName: `QA Alpha Corp ${runId}`,
        businessEmail: vendorAlphaEmail,
        businessPhone: '+91 98888 11111',
        businessAddress: 'Indiranagar, Bangalore',
        adminName: 'Alpha Admin',
        adminEmail: adminAlphaEmail,
        adminPassword: 'Password@2026',
      });
    vendorAlphaId = alphaRes.body.data?.id;

    // Login Vendor Alpha
    const alphaLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminAlphaEmail,
        password: 'Password@2026',
      });
    vendorAlphaToken = alphaLoginRes.body.data?.accessToken;

    // 3. Provision Vendor Beta
    const betaRes = await request(app.getHttpServer())
      .post('/api/admin/vendors')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        businessName: `QA Beta Ltd ${runId}`,
        businessEmail: vendorBetaEmail,
        businessPhone: '+91 98888 22222',
        businessAddress: 'Koramangala, Bangalore',
        adminName: 'Beta Admin',
        adminEmail: adminBetaEmail,
        adminPassword: 'Password@2026',
      });
    vendorBetaId = betaRes.body.data?.id;

    // Login Vendor Beta
    const betaLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminBetaEmail,
        password: 'Password@2026',
      });
    vendorBetaToken = betaLoginRes.body.data?.accessToken;

    // 4. Create a Customer under Vendor Alpha
    const custRes = await request(app.getHttpServer())
      .post('/api/vendor/customers')
      .set('Authorization', `Bearer ${vendorAlphaToken}`)
      .send({
        fullName: 'Rohan Sharma',
        mobileNumber: '+919876543210',
        email: 'rohan.sharma@example.com',
        city: 'Bangalore',
        state: 'Karnataka',
        source: 'MANUAL',
        tags: ['VIP', 'Loyal'],
      });
    vendorAlphaCustomerId = custRes.body.data?.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (vendorAlphaId) {
      await prisma.customer.deleteMany({ where: { vendorId: vendorAlphaId } }).catch(() => {});
      await prisma.vendorWallet.deleteMany({ where: { vendorId: vendorAlphaId } }).catch(() => {});
      await prisma.vendor.delete({ where: { id: vendorAlphaId } }).catch(() => {});
    }
    if (vendorBetaId) {
      await prisma.vendorWallet.deleteMany({ where: { vendorId: vendorBetaId } }).catch(() => {});
      await prisma.vendor.delete({ where: { id: vendorBetaId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: { email: { in: [adminAlphaEmail, adminBetaEmail] } },
    }).catch(() => {});
    await app.close();
  });

  describe('1. Production Health & Kubernetes/Docker Readiness Probes', () => {
    it('GET /api/health - returns 200 with database healthy status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.services.database).toBe('up');
    });

    it('GET /api/health/ready - returns 200 readiness probe with database latency metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.database).toBe('connected');
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.dbLatencyMs).toBe('number');
    });
  });

  describe('2. Multi-Tenant Boundary & Security Hardening (IDOR Prevention)', () => {
    it('Vendor Beta cannot access Vendor Alpha customer profile (Cross-Tenant Isolation)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/vendor/customers/${vendorAlphaCustomerId}`)
        .set('Authorization', `Bearer ${vendorBetaToken}`)
        .expect(404); // Should return 404 because query filters by vendorId

      expect(res.body.success).toBe(false);
    });

    it('Vendor Alpha cannot modify Vendor Beta customer or access unauthorized tenant data', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/vendor/customers/${vendorAlphaCustomerId}`)
        .set('Authorization', `Bearer ${vendorBetaToken}`)
        .send({ fullName: 'Malicious Overwrite' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('Non-admin user cannot access Super Admin endpoints (/api/admin/*)', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${vendorAlphaToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/admin/wallets/reconciliation')
        .set('Authorization', `Bearer ${vendorAlphaToken}`)
        .expect(403);
    });
  });

  describe('3. Financial & Wallet Reconciliation Engine', () => {
    it('GET /api/admin/wallets/reconciliation - audits stored balances against ledger', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/wallets/reconciliation')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.totalWalletsAudited).toBe('number');
      expect(typeof res.body.data.reconciledCount).toBe('number');
      expect(typeof res.body.data.discrepancyCount).toBe('number');
      expect(Array.isArray(res.body.data.results)).toBe(true);

      // Verify that Alpha wallets are part of the audit results
      const alphaWallets = res.body.data.results.filter((r: any) => r.vendorId === vendorAlphaId);
      expect(alphaWallets.length).toBeGreaterThan(0);
      alphaWallets.forEach((wallet: any) => {
        expect(['BALANCED', 'DISCREPANCY_FOUND']).toContain(wallet.status);
        expect(wallet.calculatedBalance).toBeDefined();
        expect(wallet.storedBalance).toBeDefined();
      });
    });

    it('GET /api/admin/wallets/reconciliation?vendorId=... - scopes reconciliation to single vendor', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/wallets/reconciliation?vendorId=${vendorAlphaId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.results.forEach((r: any) => {
        expect(r.vendorId).toBe(vendorAlphaId);
      });
    });
  });

  describe('4. Super Admin Business Intelligence & Reports', () => {
    it('GET /api/admin/metrics - aggregates revenue, margins, and gateway usage', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const metrics = res.body.data;
      expect(metrics.overview).toBeDefined();
      expect(typeof metrics.overview.totalVendors).toBe('number');
      expect(metrics.revenue).toBeDefined();
      expect(typeof metrics.revenue.totalRevenue).toBe('number');
      expect(metrics.usage).toBeDefined();
      expect(metrics.gatewayCosts).toBeDefined();
      expect(metrics.margins).toBeDefined();
      expect(Array.isArray(metrics.topVendors)).toBe(true);
    });

    it('GET /api/admin/audit-logs - returns immutable platform activity audit logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
    });
  });

  describe('5. Vendor Analytics & Performance Engine', () => {
    it('GET /api/vendor/analytics - retrieves campaign delivery metrics with default 30d filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/vendor/analytics')
        .set('Authorization', `Bearer ${vendorAlphaToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.timeframe).toBe('30d');
      expect(data.summary).toBeDefined();
      expect(typeof data.summary.totalCampaigns).toBe('number');
      expect(typeof data.summary.totalSent).toBe('number');
      expect(typeof data.summary.totalDelivered).toBe('number');
      expect(typeof data.summary.avgDeliveryRate).toBe('number');
      expect(data.channelBreakdown).toBeDefined();
      expect(data.channelBreakdown.SMS).toBeDefined();
      expect(data.channelBreakdown.WHATSAPP).toBeDefined();
      expect(data.channelBreakdown.EMAIL).toBeDefined();
      expect(data.walletBalances).toBeDefined();
    });

    it('GET /api/vendor/analytics?timeframe=today - supports dynamic timeframe filtering', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/vendor/analytics?timeframe=today')
        .set('Authorization', `Bearer ${vendorAlphaToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.timeframe).toBe('today');
    });
  });

  describe('6. Public Webhook Resiliency & Signature Handling', () => {
    it('POST /api/webhooks/sms/msg91 - acknowledges DLT delivery report', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks/sms/msg91')
        .send({
          requestId: 'msg91-req-test-12345',
          status: '1', // Delivered
          desc: 'Delivered successfully',
          mobile: '919876543210',
        })
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('POST /api/webhooks/email/ses - handles bounce and complaint payload safely', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks/email/ses')
        .send({
          notificationType: 'Bounce',
          bounce: {
            bounceType: 'Permanent',
            bouncedRecipients: [{ emailAddress: 'bounced.recipient@example.com' }],
          },
          mail: {
            messageId: 'ses-msg-id-12345',
          },
        })
        .expect(200);

      expect(res.body.received).toBe(true);
    });
  });
});
