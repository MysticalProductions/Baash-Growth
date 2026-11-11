import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('BAASH GROWTH Part 2: Customer CRM & Communication E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now();
  const vendorAEmail = `crm.alpha.${runId}@test.in`;
  const vendorBEmail = `crm.beta.${runId}@test.in`;
  const adminAEmail = `crm.admin.alpha.${runId}@test.in`;
  const adminBEmail = `crm.admin.beta.${runId}@test.in`;

  let superAdminToken: string;
  let vendorAToken: string;
  let vendorBToken: string;
  let vendorAId: string;
  let vendorBId: string;

  let createdCustomerId: string;
  let createdTagId: string;
  let createdSegmentId: string;
  let createdTemplateId: string;

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

    // 1. Login as Super Admin
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
        businessName: `Alpha Club ${runId}`,
        businessEmail: vendorAEmail,
        businessPhone: '+919111111111',
        adminName: 'Alpha CRM Admin',
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
        businessName: `Beta Club ${runId}`,
        businessEmail: vendorBEmail,
        businessPhone: '+919222222222',
        adminName: 'Beta CRM Admin',
        adminEmail: adminBEmail,
        adminPassword: 'Password@123',
      })
      .expect(201);

    vendorBId = vendorBRes.body.vendor.id;

    // 4. Login as Vendor A Admin
    const loginARes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminAEmail,
        password: 'Password@123',
      })
      .expect(200);

    vendorAToken = loginARes.body.tokens.accessToken;

    // 5. Login as Vendor B Admin
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
    await prisma.user.deleteMany({
      where: {
        email: { in: [adminAEmail, adminBEmail] },
      },
    }).catch(() => {});

    await app.close();
  });

  describe('1. Customer Tags Management', () => {
    it('POST /api/tags - creates a vendor-scoped tag', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          name: 'VIP Experience',
          color: '#7B35E8',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('VIP Experience');
      expect(res.body.color).toBe('#7B35E8');
      expect(res.body.vendorId).toBe(vendorAId);
      createdTagId = res.body.id;
    });

    it('GET /api/tags - lists tags with customer assignment count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tags')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const tag = res.body.find((t: any) => t.id === createdTagId);
      expect(tag).toBeDefined();
    });
  });

  describe('2. Customer CRUD & Duplicate Prevention', () => {
    it('POST /api/customers - creates customer with normalized Indian phone number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          fullName: 'Arjun Kapoor',
          phone: '9876543210', // 10 digit Indian number
          email: 'Arjun.Kapoor@Gmail.Com', // Mixed case email
          city: 'Delhi',
          state: 'Delhi',
          gender: 'MALE',
          tagIds: [createdTagId],
          source: 'WEBSITE',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.fullName).toBe('Arjun Kapoor');
      expect(res.body.phone).toBe('+919876543210'); // Normalized E.164
      expect(res.body.email).toBe('arjun.kapoor@gmail.com'); // Normalized lowercase
      expect(res.body.vendorId).toBe(vendorAId);
      expect(res.body.tags.length).toBe(1);
      expect(res.body.consents.length).toBe(3); // SMS, WHATSAPP, EMAIL default UNKNOWN
      createdCustomerId = res.body.id;
    });

    it('POST /api/customers - prevents accidental duplicate customer creation within vendor', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          fullName: 'Arjun Kapoor Duplicate',
          phone: '+91 98765 43210',
          email: 'different.email@test.in',
        })
        .expect(409); // Conflict

      expect(res.body.isDuplicate).toBe(true);
      expect(res.body.message).toContain('already exists');
    });

    it('POST /api/customers - allows duplicate when explicitly confirmed by user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          fullName: 'Arjun Kapoor Explicit Shared Phone',
          phone: '+919876543210',
          email: 'arjun.family@test.in',
          confirmDuplicate: true, // Explicit override
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.phone).toBe('+919876543210');
    });

    it('GET /api/customers/:id - retrieves full customer profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdCustomerId);
      expect(res.body.fullName).toBe('Arjun Kapoor');
      expect(res.body.tags).toBeDefined();
      expect(res.body.consents).toBeDefined();
    });

    it('PUT /api/customers/:id - updates customer profile', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          fullName: 'Arjun Kapoor (Updated)',
          notes: 'Customer prefers evening communications',
        })
        .expect(200);

      expect(res.body.fullName).toBe('Arjun Kapoor (Updated)');
      expect(res.body.notes).toBe('Customer prefers evening communications');
    });
  });

  describe('3. CSV Customer Import Wizard', () => {
    it('GET /api/customers/import/template - downloads CSV template', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/customers/import/template')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Full Name');
      expect(res.text).toContain('Mobile Phone');
    });

    it('POST /api/customers/import/preview - parses and validates rows with duplicate detection', async () => {
      const csvData = [
        'Full Name,Mobile Phone,Email Address,City,State,Gender',
        'Pooja Sharma,9812345678,pooja@test.in,Bengaluru,Karnataka,FEMALE',
        'Arjun Duplicate,9876543210,duplicate@test.in,Delhi,Delhi,MALE', // Existing phone
        ',9999999999,noname@test.in,Delhi,Delhi,MALE', // Missing name
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post('/api/customers/import/preview')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          csvData,
          fileName: 'test_upload.csv',
        })
        .expect(201);

      expect(res.body.totalRows).toBe(3);
      expect(res.body.validRows).toBe(1);
      expect(res.body.duplicateRows).toBe(1);
      expect(res.body.invalidRows).toBe(1);
      expect(res.body.preview.length).toBeGreaterThan(0);
      expect(res.body.invalidDetails.length).toBeGreaterThan(0);
    });

    it('POST /api/customers/import/confirm - executes batch import', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/customers/import/confirm')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          rows: [
            {
              fullName: 'Sunil Kumar',
              phone: '9811122233',
              email: 'sunil@test.in',
              city: 'Delhi',
            },
          ],
          fileName: 'confirm_batch.csv',
          skipDuplicates: true,
        })
        .expect(201);

      expect(res.body.successfulRows).toBe(1);
      expect(res.body.importId).toBeDefined();
    });
  });

  describe('4. Marketing Consent Management', () => {
    it('PUT /api/customers/:id/consent - updates consent status with lawful basis', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/customers/${createdCustomerId}/consent`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          channel: 'WHATSAPP',
          status: 'OPTED_IN',
          source: 'Website Registration Checkbox',
          notes: 'Customer checked marketing opt-in box on booking form',
        })
        .expect(200);

      expect(res.body.channel).toBe('WHATSAPP');
      expect(res.body.status).toBe('OPTED_IN');
      expect(res.body.source).toBe('Website Registration Checkbox');
      expect(res.body.consentTimestamp).toBeDefined();
    });

    it('PUT /api/customers/:id/consent - marks consent as OPTED_OUT with suppression timestamp', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/customers/${createdCustomerId}/consent`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          channel: 'SMS',
          status: 'OPTED_OUT',
          source: 'Customer STOP Request',
          notes: 'Customer texted STOP to suppress SMS marketing',
        })
        .expect(200);

      expect(res.body.channel).toBe('SMS');
      expect(res.body.status).toBe('OPTED_OUT');
      expect(res.body.optOutTimestamp).toBeDefined();
    });
  });

  describe('5. Customer Segments', () => {
    it('POST /api/segments - creates a dynamic segment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/segments')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          name: 'Delhi VIPs with WhatsApp',
          description: 'Delhi residents with WhatsApp opt-in',
          filters: {
            city: 'Delhi',
            whatsAppConsent: 'OPTED_IN',
          },
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Delhi VIPs with WhatsApp');
      expect(res.body.vendorId).toBe(vendorAId);
      createdSegmentId = res.body.id;
    });

    it('POST /api/segments/preview - live calculates matching customer count for filters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/segments/preview')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          filters: {
            city: 'Delhi',
            whatsAppConsent: 'OPTED_IN',
          },
        })
        .expect(201);

      expect(typeof res.body.matchedCount).toBe('number');
      expect(res.body.matchedCount).toBeGreaterThanOrEqual(1); // Arjun Kapoor matches
    });

    it('GET /api/segments - returns dynamically evaluated customer count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/segments')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const seg = res.body.find((s: any) => s.id === createdSegmentId);
      expect(seg).toBeDefined();
      expect(seg.matchedCustomerCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/segments/:id/customers - retrieves matching customer list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/segments/${createdSegmentId}/customers`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);

      expect(res.body.customers).toBeDefined();
      expect(res.body.customers.length).toBeGreaterThanOrEqual(1);
      expect(res.body.customers.some((c: any) => c.id === createdCustomerId)).toBe(true);
    });
  });

  describe('6. Message Templates', () => {
    it('POST /api/templates - creates SMS template with segment calculation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/templates')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          channel: 'SMS',
          name: 'Special Deal SMS',
          content: 'Hi {{customer_name}}, special 20% off this weekend at {{vendor_name}}! Reply STOP to opt out.',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.channel).toBe('SMS');
      expect(res.body.variables).toContain('customer_name');
      expect(res.body.variables).toContain('vendor_name');
      expect(res.body.smsStats).toBeDefined();
      expect(res.body.smsStats.segmentCount).toBe(1);
      createdTemplateId = res.body.id;
    });

    it('POST /api/templates - creates WhatsApp template in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/templates')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          channel: 'WHATSAPP',
          name: 'VIP Welcome WhatsApp',
          category: 'MARKETING',
          content: 'Welcome {{customer_name}} to {{vendor_name}}! We are thrilled to host you.',
        })
        .expect(201);

      expect(res.body.channel).toBe('WHATSAPP');
      expect(res.body.metaStatus).toBe('DRAFT');
    });

    it('POST /api/templates - creates Email template with subject', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/templates')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          channel: 'EMAIL',
          name: 'Newsletter Email',
          subject: 'Exclusive Invitation for {{customer_name}}',
          content: '<p>Dear {{customer_name}}, welcome to {{vendor_name}}.</p>',
        })
        .expect(201);

      expect(res.body.channel).toBe('EMAIL');
      expect(res.body.subject).toContain('customer_name');
    });
  });

  describe('7. Multi-Tenant Data Isolation Enforcement', () => {
    it('Vendor B CANNOT access Vendor A customer record', async () => {
      await request(app.getHttpServer())
        .get(`/api/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(404); // Returns 404 to avoid leaking tenant data existence
    });

    it('Vendor B CANNOT update Vendor A customer record', async () => {
      await request(app.getHttpServer())
        .put(`/api/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .send({ fullName: 'Malicious Horizontal Escalation' })
        .expect(404);
    });

    it('Vendor B CANNOT access Vendor A segment', async () => {
      await request(app.getHttpServer())
        .get(`/api/segments/${createdSegmentId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(404);
    });

    it('Vendor B CANNOT access Vendor A template', async () => {
      await request(app.getHttpServer())
        .get(`/api/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(404);
    });

    it('Vendor B customer list is completely isolated from Vendor A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', `Bearer ${vendorBToken}`)
        .expect(200);

      expect(res.body.total).toBe(0); // Vendor B has 0 customers
      expect(res.body.data.length).toBe(0);
    });
  });
});
