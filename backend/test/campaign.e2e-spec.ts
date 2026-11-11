import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('BAASH GROWTH Part 4: Real SMS, WhatsApp, Email Integrations & Campaign Management E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now();
  const vendorEmail = `campaign.vendor.${runId}@test.in`;
  const vendorUserEmail = `vendor.user.${runId}@test.in`;

  let superAdminToken: string;
  let vendorToken: string;
  let vendorId: string;
  let customer1Id: string;
  let customer2Id: string;
  let customerOptOutId: string;
  let campaignId: string;

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

    // 2. Create Vendor
    const vendorRes = await request(app.getHttpServer())
      .post('/api/admin/vendors')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        businessName: `Campaign Testing Studio ${runId}`,
        businessEmail: vendorEmail,
        businessPhone: '+919876500001',
      })
      .expect(201);

    vendorId = vendorRes.body.id;

    // 3. Create Vendor Admin User
    const userRole = await prisma.role.findUnique({ where: { name: 'VENDOR_ADMIN' } });
    const user = await prisma.user.create({
      data: {
        email: vendorUserEmail,
        fullName: 'Campaign Manager',
        passwordHash: '$2a$10$wT8B1Kj2vQv2dM5Yh.2HgeYv8XfB.1e2j7kYg3r5f7d.2v6b5y.', // Password@123
        isActive: true,
        isEmailVerified: true,
        userRoles: { create: { roleId: userRole!.id } },
        vendorUsers: { create: { vendorId: vendorId, status: 'ACTIVE' } },
      },
    });

    // 4. Authenticate Vendor
    const vendorLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: vendorUserEmail,
        password: 'Password@123',
      })
      .expect(200);

    vendorToken = vendorLoginRes.body.tokens.accessToken;

    // 5. Pre-fund Vendor Wallets for testing
    await prisma.vendorWallet.upsert({
      where: { vendorId_channel: { vendorId, channel: 'SMS' } },
      update: { availableCredits: 500, totalPurchased: 500 },
      create: { vendorId, channel: 'SMS', availableCredits: 500, totalPurchased: 500 },
    });
    await prisma.vendorWallet.upsert({
      where: { vendorId_channel: { vendorId, channel: 'WHATSAPP' } },
      update: { availableCredits: 500, totalPurchased: 500 },
      create: { vendorId, channel: 'WHATSAPP', availableCredits: 500, totalPurchased: 500 },
    });
    await prisma.vendorWallet.upsert({
      where: { vendorId_channel: { vendorId, channel: 'EMAIL' } },
      update: { availableCredits: 500, totalPurchased: 500 },
      create: { vendorId, channel: 'EMAIL', availableCredits: 500, totalPurchased: 500 },
    });

    // 6. Create Demo Customers with Consents
    const c1 = await prisma.customer.create({
      data: {
        vendorId,
        fullName: 'Aarav Mehta',
        phone: '+919876543210',
        email: 'aarav.mehta@test.com',
        city: 'Bengaluru',
        consents: {
          create: [
            { channel: 'SMS', status: 'OPTED_IN' },
            { channel: 'WHATSAPP', status: 'OPTED_IN' },
            { channel: 'EMAIL', status: 'OPTED_IN' },
          ],
        },
      },
    });
    customer1Id = c1.id;

    const c2 = await prisma.customer.create({
      data: {
        vendorId,
        fullName: 'Diya Sen',
        phone: '+919812345678',
        email: 'diya.sen@test.com',
        city: 'Mumbai',
        consents: {
          create: [
            { channel: 'SMS', status: 'OPTED_IN' },
            { channel: 'WHATSAPP', status: 'OPTED_IN' },
            { channel: 'EMAIL', status: 'OPTED_IN' },
          ],
        },
      },
    });
    customer2Id = c2.id;

    const c3 = await prisma.customer.create({
      data: {
        vendorId,
        fullName: 'Kabir Verma (Opted Out SMS)',
        phone: '+919899999999',
        email: 'kabir.verma@test.com',
        city: 'Delhi',
        consents: {
          create: [
            { channel: 'SMS', status: 'OPTED_OUT' }, // Opted Out
            { channel: 'WHATSAPP', status: 'OPTED_IN' },
          ],
        },
      },
    });
    customerOptOutId = c3.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Admin Communication Provider & Pricing Management', () => {
    it('GET /api/admin/providers: should list providers with masked credentials', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/providers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const msg91 = res.body.find((p: any) => p.channel === 'SMS');
      expect(msg91).toBeDefined();
      expect(msg91.providerName).toBe('MSG91');
      // Verify credentials are masked
      expect(msg91.credentials.authKey).toContain('••••');
    });

    it('PUT /api/admin/providers/:channel: should update provider settings', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/admin/providers/SMS')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          providerName: 'MSG91',
          isActive: true,
          isSandbox: true,
          credentials: {
            authKey: 'msg91_updated_key_test',
            senderId: 'BAASHX',
            dltEntityId: '1201159000000999999',
          },
        })
        .expect(200);

      expect(res.body.channel).toBe('SMS');
      expect(res.body.credentials.senderId).toBe('BAASHX');
    });

    it('POST /api/admin/providers/:channel/test: should test connection and return success', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/providers/SMS/test')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Verified');
      expect(res.body.latencyMs).toBeDefined();
    });

    it('GET /api/admin/channel-pricing: should list channel pricing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/channel-pricing')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const smsPricing = res.body.find((p: any) => p.channel === 'SMS');
      expect(smsPricing).toBeDefined();
    });

    it('PUT /api/admin/channel-pricing/:channel: should update channel pricing', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/admin/channel-pricing/SMS')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sellingCreditsPerUnit: 1.0,
          estimatedProviderCost: 0.15,
        })
        .expect(200);

      expect(Number(res.body.sellingCreditsPerUnit)).toBe(1.0);
    });
  });

  describe('2. Campaign Audience Screening & Credit Estimation', () => {
    it('POST /api/campaigns/estimate: should screen audience and exclude opted-out customers', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/campaigns/estimate')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          channel: 'SMS',
          content: 'Hello {{name}}, welcome to our exclusive event! Visit baash.in.',
          audienceType: 'ALL_CUSTOMERS',
        })
        .expect(201);

      expect(res.body.totalRecipientsFound).toBe(3);
      // Kabir Verma was opted-out of SMS, so only 2 should be eligible!
      expect(res.body.eligibleCount).toBe(2);
      expect(res.body.excludedCount).toBe(1);
      expect(res.body.excludedBreakdown['CONSENT_OPTED_OUT']).toBe(1);
      expect(res.body.creditsPerRecipient).toBe(1);
      expect(res.body.totalEstimatedCredits).toBe(2);
      expect(res.body.wallet.hasSufficientBalance).toBe(true);
    });

    it('POST /api/campaigns/estimate: should calculate multi-segment credits for long SMS', async () => {
      // 180 characters GSM-7 -> 2 segments (since > 160)
      const longText = 'This is a very long text message designed specifically to exceed one single GSM-7 segment and require two concatenated segments for proper delivery to the recipient in India today.'.slice(0, 180);

      const res = await request(app.getHttpServer())
        .post('/api/campaigns/estimate')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          channel: 'SMS',
          content: longText,
          audienceType: 'ALL_CUSTOMERS',
        })
        .expect(201);

      expect(res.body.creditsPerRecipient).toBe(2);
      expect(res.body.totalEstimatedCredits).toBe(4); // 2 eligible * 2 segments
    });
  });

  describe('3. Campaign Creation, Wallet Reservation & Live Dispatch', () => {
    it('POST /api/campaigns: should reject campaign if wallet has insufficient credits', async () => {
      // Temporarily drain SMS wallet
      await prisma.vendorWallet.update({
        where: { vendorId_channel: { vendorId, channel: 'SMS' } },
        data: { availableCredits: 0 },
      });

      const res = await request(app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Insufficient Credit Campaign',
          channel: 'SMS',
          content: 'Test content',
          audienceType: 'ALL_CUSTOMERS',
          sendImmediately: true,
        })
        .expect(400);

      expect(res.body.message).toContain('Insufficient SMS wallet credits');

      // Restore wallet balance
      await prisma.vendorWallet.update({
        where: { vendorId_channel: { vendorId, channel: 'SMS' } },
        data: { availableCredits: 500 },
      });
    });

    it('POST /api/campaigns: should create campaign, reserve credits and dispatch successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Festival Weekend Broadcast',
          channel: 'WHATSAPP',
          content: 'Hello {{name}}, welcome to our festival special experience in {{city}}!',
          audienceType: 'ALL_CUSTOMERS',
          sendImmediately: true,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      campaignId = res.body.id;
      expect(res.body.status).toBe('QUEUED');
      expect(res.body.eligibleRecipients).toBe(3); // All 3 opted in for WhatsApp
      expect(res.body.reservedCredits).toBe(3);

      // Verify wallet reservation
      const wallet = await prisma.vendorWallet.findUnique({
        where: { vendorId_channel: { vendorId, channel: 'WHATSAPP' } },
      });
      expect(wallet!.availableCredits).toBe(497); // 500 - 3 reserved
      expect(wallet!.reservedCredits).toBe(3);

      // Allow background dispatch worker to finish
      await new Promise((r) => setTimeout(r, 1500));

      // Verify campaign completed
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { recipients: true },
      });
      expect(updatedCampaign!.status).toBe('COMPLETED');
      expect(updatedCampaign!.sentCount).toBe(3);
      expect(updatedCampaign!.consumedCredits).toBe(3);

      // Verify final wallet capture
      const postWallet = await prisma.vendorWallet.findUnique({
        where: { vendorId_channel: { vendorId, channel: 'WHATSAPP' } },
      });
      expect(postWallet!.reservedCredits).toBe(0);
      expect(postWallet!.totalConsumed).toBe(3);
    });

    it('GET /api/campaigns/:id: should return single campaign with metrics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.id).toBe(campaignId);
      expect(res.body.name).toBe('Festival Weekend Broadcast');
      expect(res.body.sentCount).toBe(3);
    });

    it('GET /api/campaigns/:id/recipients: should list individual delivery logs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/campaigns/${campaignId}/recipients`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].status).toBe('SUBMITTED');
      expect(res.body.data[0].providerMessageId).toBeDefined();
    });

    it('GET /api/campaigns/:id/export: should export recipient logs as CSV', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/campaigns/${campaignId}/export`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Customer Name,Destination,Status');
      expect(res.text).toContain('Aarav Mehta');
    });
  });

  describe('4. Scheduled Campaign Cancellation & Credit Release', () => {
    it('POST /api/campaigns: should schedule a campaign and cancel it with refund', async () => {
      const scheduleDate = new Date(Date.now() + 86400000).toISOString();

      const createRes = await request(app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Scheduled Future Offer',
          channel: 'SMS',
          content: 'Exclusive upcoming deals for {{name}}!',
          audienceType: 'ALL_CUSTOMERS',
          sendImmediately: false,
          scheduledAt: scheduleDate,
        })
        .expect(201);

      const scheduledCampaignId = createRes.body.id;
      expect(createRes.body.status).toBe('SCHEDULED');
      expect(createRes.body.reservedCredits).toBe(2);

      // Verify wallet reserved credits increased
      const walletBeforeCancel = await prisma.vendorWallet.findUnique({
        where: { vendorId_channel: { vendorId, channel: 'SMS' } },
      });
      expect(walletBeforeCancel!.reservedCredits).toBe(2);

      // Cancel the scheduled campaign
      await request(app.getHttpServer())
        .post(`/api/campaigns/${scheduledCampaignId}/cancel`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(201);

      // Verify campaign status is CANCELLED
      const cancelledCampaign = await prisma.campaign.findUnique({
        where: { id: scheduledCampaignId },
      });
      expect(cancelledCampaign!.status).toBe('CANCELLED');
      expect(cancelledCampaign!.releasedCredits).toBe(2);

      // Verify wallet credits released back
      const walletAfterCancel = await prisma.vendorWallet.findUnique({
        where: { vendorId_channel: { vendorId, channel: 'SMS' } },
      });
      expect(walletAfterCancel!.reservedCredits).toBe(0);
      expect(walletAfterCancel!.availableCredits).toBe(500); // 100% refunded
    });
  });

  describe('5. Inbound Webhooks & Status Updates', () => {
    it('GET /api/webhooks/whatsapp: should verify Meta webhook challenge', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge_code_123&hub.verify_token=baash_whatsapp_webhook_verify_token')
        .expect(200);

      expect(res.text).toBe('test_challenge_code_123');
    });

    it('POST /api/webhooks/whatsapp: should update message status to DELIVERED', async () => {
      // Find a recipient providerMessageId
      const recipient = await prisma.campaignRecipient.findFirst({
        where: { campaignId },
      });

      expect(recipient).toBeDefined();

      const webhookPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    {
                      id: recipient!.providerMessageId,
                      status: 'delivered',
                      recipient_id: recipient!.destination,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(201);

      // Verify recipient updated
      const updatedRecipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipient!.id },
      });
      expect(updatedRecipient!.status).toBe('DELIVERED');
      expect(updatedRecipient!.deliveredAt).toBeDefined();
    });

    it('POST /api/webhooks/ses: should record bounce and add destination to suppression list', async () => {
      const bouncePayload = {
        notificationType: 'Bounce',
        mail: {
          messageId: 'ses_test_bounce_message_id_001',
        },
        bounce: {
          bounceType: 'Permanent',
          bouncedRecipients: [
            { emailAddress: 'bounced.customer@test.com' },
          ],
        },
      };

      await request(app.getHttpServer())
        .post('/api/webhooks/ses')
        .send(bouncePayload)
        .expect(201);

      // Verify suppression record created
      const suppression = await prisma.suppressionRecord.findUnique({
        where: {
          channel_destination: {
            channel: 'EMAIL',
            destination: 'bounced.customer@test.com',
          },
        },
      });

      expect(suppression).toBeDefined();
      expect(suppression!.reason).toContain('BOUNCE');
    });
  });

  describe('6. Additional Vendor Campaign Management APIs & Reporting', () => {
    let draftCampaignId: string;

    it('POST /api/campaigns: should create a draft campaign without immediately sending', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Draft Special Experience',
          channel: 'EMAIL',
          subject: 'Special Invite',
          content: 'Hello {{customer_name}}, visit us in {{customer_city}}!',
          audienceType: 'ALL_CUSTOMERS',
          sendImmediately: false,
        })
        .expect(201);

      draftCampaignId = res.body.id;
      expect(res.body.status).toBe('SCHEDULED');
    });

    it('PUT /api/campaigns/:id: should update draft campaign details', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/campaigns/${draftCampaignId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Updated Draft Special Experience',
          content: 'Updated content for {{customer_name}}',
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Draft Special Experience');
    });

    it('POST /api/campaigns/:id/validate-audience: should screen audience for existing campaign', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/campaigns/${draftCampaignId}/validate-audience`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(201);

      expect(res.body.totalFound).toBeDefined();
      expect(res.body.eligible).toBeDefined();
    });

    it('POST /api/campaigns/:id/estimate: should estimate cost for existing campaign', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/campaigns/${draftCampaignId}/estimate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(201);

      expect(res.body.totalEstimatedCredits).toBeDefined();
      expect(res.body.wallet.hasSufficientBalance).toBe(true);
    });

    it('GET /api/campaigns/:id/report: should return full analytical & financial report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/campaigns/${campaignId}/report`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.counts).toBeDefined();
      expect(res.body.financials).toBeDefined();
      expect(res.body.statusBreakdown).toBeDefined();
    });

    it('DELETE /api/campaigns/:id: should delete draft campaign', async () => {
      await request(app.getHttpServer())
        .delete(`/api/campaigns/${draftCampaignId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
    });
  });

  describe('7. Admin Platform Campaign Monitoring & Health Oversight', () => {
    it('GET /api/admin/campaign-reports: should return global metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/campaign-reports')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalCampaigns).toBeGreaterThanOrEqual(1);
      expect(res.body.channelBreakdown).toBeDefined();
    });

    it('GET /api/admin/provider-monitoring: should return real-time provider health & event stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/provider-monitoring')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.providers).toBeDefined();
      expect(res.body.webhookEventStats).toBeDefined();
      expect(res.body.recentEvents).toBeDefined();
    });
  });
});
