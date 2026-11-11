import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('BAASH GROWTH End-to-End & Multi-Tenancy Test Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now();
  const vendorAEmail = `contact.alpha.${runId}@test.in`;
  const vendorBEmail = `contact.beta.${runId}@test.in`;
  const adminAEmail = `admin.alpha.${runId}@test.in`;
  const adminBEmail = `admin.beta.${runId}@test.in`;

  let superAdminToken: string;
  let vendorAToken: string;
  let vendorBToken: string;
  let vendorAId: string;
  let vendorBId: string;
  let vendorARefreshCookie: string;

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
  });

  afterAll(async () => {
    // Clean up test vendors and users created during this test run
    if (vendorAId) {
      await prisma.vendor.delete({ where: { id: vendorAId } }).catch(() => {});
    }
    if (vendorBId) {
      await prisma.vendor.delete({ where: { id: vendorBId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: [adminAEmail, adminBEmail, `staff.${runId}@test.in`] },
      },
    }).catch(() => {});

    await app.close();
  });

  describe('1. Health & Infrastructure', () => {
    it('GET /api/health - returns 200 healthy status with db up', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.services.database).toBe('up');
    });
  });

  describe('2. Authentication & Session Management', () => {
    it('POST /api/auth/login - fails with invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@baash.in',
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('POST /api/auth/login - Super Admin successfully logs in', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@baash.in',
          password: 'BaashAdmin@2026',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      superAdminToken = res.body.data.accessToken;

      // Check cookie
      const rawCookies = res.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies].filter(Boolean) as string[];
      expect(cookies.length).toBeGreaterThan(0);
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      vendorARefreshCookie = refreshCookie!;
    });

    it('POST /api/auth/refresh - rotates refresh token and returns new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [vendorARefreshCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      superAdminToken = res.body.data.accessToken;
    });

    it('GET /api/auth/me - returns authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@baash.in');
      expect(res.body.data.role).toBe('SUPER_ADMIN');
    });
  });

  describe('3. Super Admin Platform & Vendor Provisioning', () => {
    it('POST /api/admin/vendors - creates Vendor A (Alpha Workspace)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/vendors')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          businessName: `Alpha Workspace ${runId}`,
          businessEmail: vendorAEmail,
          businessPhone: '+91 99999 11111',
          businessAddress: 'HSR Layout, Bangalore',
          adminName: 'Alpha Admin',
          adminEmail: adminAEmail,
          adminPassword: 'AlphaAdmin@2026',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.businessName).toBe(`Alpha Workspace ${runId}`);
      vendorAId = res.body.data.id;
    });

    it('POST /api/admin/vendors - creates Vendor B (Beta Workspace)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/vendors')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          businessName: `Beta Workspace ${runId}`,
          businessEmail: vendorBEmail,
          businessPhone: '+91 99999 22222',
          businessAddress: 'Koramangala, Bangalore',
          adminName: 'Beta Admin',
          adminEmail: adminBEmail,
          adminPassword: 'BetaAdmin@2026',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.businessName).toBe(`Beta Workspace ${runId}`);
      vendorBId = res.body.data.id;
    });

    it('GET /api/admin/dashboard - Super Admin views platform overview', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.totalVendors).toBeGreaterThanOrEqual(2);
      expect(res.body.data.recentVendors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4. RBAC & Unauthorized Access Prevention', () => {
    beforeAll(async () => {
      // Log in as Vendor A Admin
      const resA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminAEmail,
          password: 'AlphaAdmin@2026',
        })
        .expect(200);
      vendorAToken = resA.body.data.accessToken;

      // Log in as Vendor B Admin
      const resB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminBEmail,
          password: 'BetaAdmin@2026',
        })
        .expect(200);
      vendorBToken = resB.body.data.accessToken;
    });

    it('GET /api/admin/dashboard - Vendor A is forbidden from admin dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('POST /api/admin/vendors - Vendor A cannot provision new vendors', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/vendors')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          businessName: 'Unauthorized Vendor',
          businessEmail: `unauth.${runId}@test.com`,
          adminName: 'Test',
          adminEmail: `unauth.admin.${runId}@test.com`,
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Strict Multi-Tenant Isolation & Horizontal Privilege Escalation Prevention', () => {
    it('GET /api/vendor/profile - Vendor A accesses only Vendor A profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/vendor/profile')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(vendorAId);
      expect(res.body.data.businessName).toBe(`Alpha Workspace ${runId}`);
    });

    it('GET /api/vendor/profile - Vendor B accesses only Vendor B profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/vendor/profile')
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(vendorBId);
      expect(res.body.data.businessName).toBe(`Beta Workspace ${runId}`);
    });

    it('PUT /api/vendor/profile - Vendor A cannot modify Vendor B even by passing vendorId in body', async () => {
      // Vendor A attempts to pass Vendor B's vendorId in payload
      const res = await request(app.getHttpServer())
        .put('/api/vendor/profile')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          vendorId: vendorBId, // Attempted horizontal escalation
          businessName: `Alpha Workspace Renamed ${runId}`,
        });

      if (res.status === 200) {
        // Verify Vendor B was NOT changed!
        const checkB = await prisma.vendor.findUnique({ where: { id: vendorBId } });
        expect(checkB?.businessName).toBe(`Beta Workspace ${runId}`);

        // And Vendor A was updated
        const checkA = await prisma.vendor.findUnique({ where: { id: vendorAId } });
        expect(checkA?.businessName).toBe(`Alpha Workspace Renamed ${runId}`);
      } else {
        expect(res.status).toBe(403);
      }
    });

    it('POST /api/vendor/users/invite - Vendor A invites staff to Vendor A', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/vendor/users/invite')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          email: `staff.${runId}@test.in`,
          roleName: 'VENDOR_STAFF',
          permissions: ['customer:read', 'campaign:read'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe(`staff.${runId}@test.in`);
      expect(res.body.data.invitation.token).toBeDefined();
    });

    it('GET /api/vendor/users - Vendor B CANNOT see Vendor A staff or pending invitations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/vendor/users')
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const memberEmails = res.body.data.members.map((m: any) => m.email);
      const inviteEmails = res.body.data.pendingInvitations.map((i: any) => i.email);

      // Verify Vendor A staff does not leak into Vendor B
      expect(memberEmails).not.toContain(`staff.${runId}@test.in`);
      expect(inviteEmails).not.toContain(`staff.${runId}@test.in`);
      expect(memberEmails).toContain(adminBEmail);
    });
  });

  describe('6. Vendor Suspension & Session Revocation', () => {
    it('PATCH /api/admin/vendors/:id/status - Super Admin suspends Vendor B', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/vendors/${vendorBId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Test compliance suspension',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUSPENDED');
    });

    it('POST /api/auth/login - Suspended Vendor B users are prevented from logging in', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminBEmail,
          password: 'BetaAdmin@2026',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('suspended');
    });
  });
});
