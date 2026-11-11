import { PrismaClient, VendorStatus, VendorUserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Platform & Vendor management
  { name: 'platform:admin', displayName: 'Platform Administration', module: 'platform', description: 'Full access to system configurations and global monitoring' },
  { name: 'vendor:read', displayName: 'View Vendors', module: 'vendor', description: 'View vendor accounts and details' },
  { name: 'vendor:write', displayName: 'Manage Vendors', module: 'vendor', description: 'Create and edit vendor accounts' },
  { name: 'vendor:status', displayName: 'Manage Vendor Status', module: 'vendor', description: 'Activate, deactivate, or suspend vendors' },
  
  // User & Staff management
  { name: 'user:read', displayName: 'View Users', module: 'user', description: 'View user and staff lists' },
  { name: 'user:write', displayName: 'Manage Users', module: 'user', description: 'Edit user profiles and roles' },
  { name: 'user:invite', displayName: 'Invite Staff', module: 'user', description: 'Send staff invitation links' },
  { name: 'user:status', displayName: 'Manage Staff Status', module: 'user', description: 'Activate, deactivate or revoke staff access' },

  // CRM & Customers
  { name: 'customer:read', displayName: 'View Customers', module: 'customer', description: 'Access customer records and segments' },
  { name: 'customer:write', displayName: 'Manage Customers', module: 'customer', description: 'Create, import and modify customer records' },

  // Campaigns
  { name: 'campaign:read', displayName: 'View Campaigns', module: 'campaign', description: 'View SMS, WhatsApp, and Email campaigns' },
  { name: 'campaign:write', displayName: 'Create & Edit Campaigns', module: 'campaign', description: 'Draft campaigns and templates' },
  { name: 'campaign:send', displayName: 'Send Campaigns', module: 'campaign', description: 'Launch and dispatch marketing campaigns' },

  // Wallet & Billing
  { name: 'wallet:read', displayName: 'View Wallet Balance', module: 'wallet', description: 'Check credit balances and transaction logs' },
  { name: 'wallet:transact', displayName: 'Purchase Credits', module: 'wallet', description: 'Buy communication credit packages' },

  // Analytics & Settings
  { name: 'analytics:read', displayName: 'View Analytics', module: 'analytics', description: 'Access reporting charts and metrics' },
  { name: 'settings:read', displayName: 'View Settings', module: 'settings', description: 'View configuration options' },
  { name: 'settings:write', displayName: 'Modify Settings', module: 'settings', description: 'Update profile and workspace settings' },
];

async function main() {
  console.log('--- SEEDING BAASH GROWTH DATABASE ---');

  // 1. Seed Permissions
  console.log('Seeding Permissions...');
  const permissionMap: Record<string, string> = {};
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { displayName: p.displayName, module: p.module, description: p.description },
      create: p,
    });
    permissionMap[p.name] = perm.id;
  }

  // 2. Seed Roles
  console.log('Seeding Roles...');
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { displayName: 'Baash Super Admin', description: 'Central platform authority with full system control' },
    create: {
      name: 'SUPER_ADMIN',
      displayName: 'Baash Super Admin',
      description: 'Central platform authority with full system control',
      isSystem: true,
    },
  });

  const vendorAdminRole = await prisma.role.upsert({
    where: { name: 'VENDOR_ADMIN' },
    update: { displayName: 'Vendor Administrator', description: 'Business owner with control over the vendor workspace' },
    create: {
      name: 'VENDOR_ADMIN',
      displayName: 'Vendor Administrator',
      description: 'Business owner with control over the vendor workspace',
      isSystem: true,
    },
  });

  const vendorStaffRole = await prisma.role.upsert({
    where: { name: 'VENDOR_STAFF' },
    update: { displayName: 'Vendor Staff', description: 'Team member with assigned operational permissions' },
    create: {
      name: 'VENDOR_STAFF',
      displayName: 'Vendor Staff',
      description: 'Team member with assigned operational permissions',
      isSystem: true,
    },
  });

  // 3. Link Role Permissions
  console.log('Linking Role Permissions...');
  // Super Admin gets all
  for (const permId of Object.values(permissionMap)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permId },
    });
  }

  // Vendor Admin permissions
  const vendorAdminPermKeys = [
    'vendor:read', 'vendor:write',
    'user:read', 'user:write', 'user:invite', 'user:status',
    'customer:read', 'customer:write',
    'campaign:read', 'campaign:write', 'campaign:send',
    'wallet:read', 'wallet:transact',
    'analytics:read',
    'settings:read', 'settings:write'
  ];
  for (const key of vendorAdminPermKeys) {
    if (permissionMap[key]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: vendorAdminRole.id, permissionId: permissionMap[key] } },
        update: {},
        create: { roleId: vendorAdminRole.id, permissionId: permissionMap[key] },
      });
    }
  }

  // Vendor Staff default permissions
  const vendorStaffPermKeys = [
    'user:read',
    'customer:read', 'customer:write',
    'campaign:read', 'campaign:write',
    'analytics:read',
    'settings:read'
  ];
  for (const key of vendorStaffPermKeys) {
    if (permissionMap[key]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: vendorStaffRole.id, permissionId: permissionMap[key] } },
        update: {},
        create: { roleId: vendorStaffRole.id, permissionId: permissionMap[key] },
      });
    }
  }

  // 4. Seed Super Admin User
  console.log('Seeding Super Admin user...');
  const salt = await bcrypt.genSalt(12);
  const adminPasswordHash = await bcrypt.hash('BaashAdmin@2026', salt);

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@baash.in' },
    update: {
      fullName: 'Baash Platform Admin',
      passwordHash: adminPasswordHash,
      isActive: true,
      isEmailVerified: true,
    },
    create: {
      email: 'admin@baash.in',
      fullName: 'Baash Platform Admin',
      passwordHash: adminPasswordHash,
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id },
  });

  // 5. Seed Initial Demo Vendor
  console.log('Seeding Demo Vendor (Acme Experience Studio)...');
  const demoVendor = await prisma.vendor.upsert({
    where: { businessEmail: 'vendor@acme.com' },
    update: {
      businessName: 'Acme Experience Studio',
      businessPhone: '+91 98765 43210',
      businessAddress: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
      status: VendorStatus.ACTIVE,
    },
    create: {
      businessName: 'Acme Experience Studio',
      businessEmail: 'vendor@acme.com',
      businessPhone: '+91 98765 43210',
      businessAddress: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
      status: VendorStatus.ACTIVE,
    },
  });

  // 6. Seed Vendor Admin User
  console.log('Seeding Vendor Admin (Aarav Sharma)...');
  const vendorAdminPasswordHash = await bcrypt.hash('VendorAdmin@2026', salt);

  const vendorAdminUser = await prisma.user.upsert({
    where: { email: 'vendor@acme.com' },
    update: {
      fullName: 'Aarav Sharma',
      passwordHash: vendorAdminPasswordHash,
      isActive: true,
      isEmailVerified: true,
    },
    create: {
      email: 'vendor@acme.com',
      fullName: 'Aarav Sharma',
      passwordHash: vendorAdminPasswordHash,
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: vendorAdminUser.id, roleId: vendorAdminRole.id } },
    update: {},
    create: { userId: vendorAdminUser.id, roleId: vendorAdminRole.id },
  });

  await prisma.vendorUser.upsert({
    where: { vendorId_userId: { vendorId: demoVendor.id, userId: vendorAdminUser.id } },
    update: { status: VendorUserStatus.ACTIVE },
    create: {
      vendorId: demoVendor.id,
      userId: vendorAdminUser.id,
      status: VendorUserStatus.ACTIVE,
    },
  });

  // 7. Seed Vendor Staff User
  console.log('Seeding Vendor Staff (Priya Patel)...');
  const vendorStaffPasswordHash = await bcrypt.hash('VendorStaff@2026', salt);

  const vendorStaffUser = await prisma.user.upsert({
    where: { email: 'staff@acme.com' },
    update: {
      fullName: 'Priya Patel',
      passwordHash: vendorStaffPasswordHash,
      isActive: true,
      isEmailVerified: true,
    },
    create: {
      email: 'staff@acme.com',
      fullName: 'Priya Patel',
      passwordHash: vendorStaffPasswordHash,
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: vendorStaffUser.id, roleId: vendorStaffRole.id } },
    update: {},
    create: { userId: vendorStaffUser.id, roleId: vendorStaffRole.id },
  });

  await prisma.vendorUser.upsert({
    where: { vendorId_userId: { vendorId: demoVendor.id, userId: vendorStaffUser.id } },
    update: { status: VendorUserStatus.ACTIVE },
    create: {
      vendorId: demoVendor.id,
      userId: vendorStaffUser.id,
      status: VendorUserStatus.ACTIVE,
    },
  });

  // 8. Seed Part 2: Customer CRM (Tags, Customers, Consents, Templates, Segments)
  console.log('Seeding Customer CRM (Tags, Customers, Consents, Templates)...');

  // Tags
  const vipTag = await prisma.customerTag.upsert({
    where: { vendorId_name: { vendorId: demoVendor.id, name: 'VIP' } },
    update: { color: '#7B35E8' },
    create: { vendorId: demoVendor.id, name: 'VIP', color: '#7B35E8' },
  });

  const regularTag = await prisma.customerTag.upsert({
    where: { vendorId_name: { vendorId: demoVendor.id, name: 'Regular' } },
    update: { color: '#0D9488' },
    create: { vendorId: demoVendor.id, name: 'Regular', color: '#0D9488' },
  });

  const delhiTag = await prisma.customerTag.upsert({
    where: { vendorId_name: { vendorId: demoVendor.id, name: 'Delhi' } },
    update: { color: '#00D4FF' },
    create: { vendorId: demoVendor.id, name: 'Delhi', color: '#00D4FF' },
  });

  const newCustTag = await prisma.customerTag.upsert({
    where: { vendorId_name: { vendorId: demoVendor.id, name: 'New Customer' } },
    update: { color: '#F72585' },
    create: { vendorId: demoVendor.id, name: 'New Customer', color: '#F72585' },
  });

  // Seed Initial Demo Customers
  const customer1 = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      vendorId: demoVendor.id,
      fullName: 'Rohan Mehra',
      phone: '+919876543210',
      email: 'rohan.mehra@gmail.com',
      gender: 'MALE',
      city: 'Delhi',
      state: 'Delhi',
      source: 'WEBSITE',
      notes: 'Frequent weekend experience attendee',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      vendorId: demoVendor.id,
      fullName: 'Ananya Deshmukh',
      phone: '+919812345678',
      email: 'ananya.d@outlook.com',
      gender: 'FEMALE',
      city: 'Bengaluru',
      state: 'Karnataka',
      source: 'BOOKING',
      notes: 'Interested in private dining workshops',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      vendorId: demoVendor.id,
      fullName: 'Karanvir Malhotra',
      phone: '+919899988877',
      email: 'karanvir.m@yahoo.com',
      gender: 'MALE',
      city: 'Delhi',
      state: 'Delhi',
      source: 'EVENT_REGISTRATION',
      notes: 'Opted out from SMS marketing',
    },
  });

  // Link Tag Assignments
  await prisma.customerTagAssignment.upsert({
    where: { customerId_tagId: { customerId: customer1.id, tagId: vipTag.id } },
    update: {},
    create: { customerId: customer1.id, tagId: vipTag.id },
  });
  await prisma.customerTagAssignment.upsert({
    where: { customerId_tagId: { customerId: customer1.id, tagId: delhiTag.id } },
    update: {},
    create: { customerId: customer1.id, tagId: delhiTag.id },
  });
  await prisma.customerTagAssignment.upsert({
    where: { customerId_tagId: { customerId: customer2.id, tagId: regularTag.id } },
    update: {},
    create: { customerId: customer2.id, tagId: regularTag.id },
  });
  await prisma.customerTagAssignment.upsert({
    where: { customerId_tagId: { customerId: customer3.id, tagId: newCustTag.id } },
    update: {},
    create: { customerId: customer3.id, tagId: newCustTag.id },
  });

  // Seed Consents
  const channels = ['SMS', 'WHATSAPP', 'EMAIL'] as const;
  for (const ch of channels) {
    // Customer 1: Opted in all
    await prisma.customerConsent.upsert({
      where: { customerId_channel: { customerId: customer1.id, channel: ch } },
      update: {},
      create: { customerId: customer1.id, channel: ch, status: 'OPTED_IN', source: 'WEBSITE' },
    });
    // Customer 2: Opted in WhatsApp & Email, Unknown SMS
    await prisma.customerConsent.upsert({
      where: { customerId_channel: { customerId: customer2.id, channel: ch } },
      update: {},
      create: { customerId: customer2.id, channel: ch, status: ch === 'SMS' ? 'UNKNOWN' : 'OPTED_IN', source: 'BOOKING' },
    });
    // Customer 3: SMS Opted Out
    await prisma.customerConsent.upsert({
      where: { customerId_channel: { customerId: customer3.id, channel: ch } },
      update: {},
      create: { customerId: customer3.id, channel: ch, status: ch === 'SMS' ? 'OPTED_OUT' : 'OPTED_IN', source: 'EVENT' },
    });
  }

  // Seed Customer Segment: Delhi VIP Customers
  await prisma.customerSegment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      vendorId: demoVendor.id,
      name: 'Delhi VIP Customers',
      description: 'Active Delhi patrons with VIP tag and WhatsApp consent',
      filters: {
        city: 'Delhi',
        tagIds: [vipTag.id],
        whatsAppConsent: 'OPTED_IN',
      },
    },
  });

  // Seed Message Templates
  await prisma.messageTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      vendorId: demoVendor.id,
      channel: 'SMS',
      name: 'Weekend Experience Discount',
      content: 'Hi {{customer_name}}, enjoy 20% off your next curated experience at {{vendor_name}}! Use code BAASH20 at booking.',
      variables: ['customer_name', 'vendor_name'],
    },
  });

  await prisma.messageTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      vendorId: demoVendor.id,
      channel: 'WHATSAPP',
      name: 'Experience Reservation Confirmation',
      category: 'UTILITY',
      content: 'Hello {{customer_name}}, your booking at {{vendor_name}} is confirmed! We look forward to hosting you in {{customer_city}}.',
      variables: ['customer_name', 'vendor_name', 'customer_city'],
      metaStatus: 'DRAFT',
    },
  });

  await prisma.messageTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000022',
      vendorId: demoVendor.id,
      channel: 'EMAIL',
      name: 'Monthly Member Insider Digest',
      subject: 'Exclusive BAASH Highlights for {{customer_name}}',
      content: '<div style="font-family: Inter, sans-serif; background-color: #0A0A0F; color: #FFFFFF; padding: 24px; border-radius: 16px;"><h1 style="color: #7B35E8;">Hello {{customer_name}},</h1><p>Check out our latest exclusive dining and rooftop sessions at {{vendor_name}}!</p></div>',
      plainTextContent: 'Hello {{customer_name}}, Check out our latest exclusive sessions at {{vendor_name}}!',
      variables: ['customer_name', 'vendor_name'],
    },
  });

  // 9. Seed Credit Packages (Part 3)
  console.log('Seeding Credit Packages (Part 3)...');
  const packagesData = [
    {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'SMS Starter',
      channel: 'SMS' as const,
      credits: 1000,
      price: 299,
      gstPercentage: 18.0,
      finalPrice: 352.82,
      description: 'Ideal for small businesses starting out with SMS notifications and OTP alerts.',
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      name: 'SMS Growth',
      channel: 'SMS' as const,
      credits: 5000,
      price: 1199,
      gstPercentage: 18.0,
      finalPrice: 1414.82,
      description: 'Best for growing businesses conducting regular weekend marketing broadcasts.',
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      name: 'WhatsApp Starter',
      channel: 'WHATSAPP' as const,
      credits: 500,
      price: 499,
      gstPercentage: 18.0,
      finalPrice: 588.82,
      description: 'Perfect for VIP customer engagement and direct concierge service conversations.',
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      name: 'WhatsApp Growth',
      channel: 'WHATSAPP' as const,
      credits: 2500,
      price: 1999,
      gstPercentage: 18.0,
      finalPrice: 2358.82,
      description: 'Designed for high-engagement venues managing active festival promotions.',
    },
    {
      id: '00000000-0000-0000-0000-000000000105',
      name: 'Email Starter',
      channel: 'EMAIL' as const,
      credits: 5000,
      price: 199,
      gstPercentage: 18.0,
      finalPrice: 234.82,
      description: 'Essential email newsletter broadcasts for curated customer announcements.',
    },
    {
      id: '00000000-0000-0000-0000-000000000106',
      name: 'Email Growth',
      channel: 'EMAIL' as const,
      credits: 25000,
      price: 799,
      gstPercentage: 18.0,
      finalPrice: 942.82,
      description: 'High-volume email delivery package with dedicated deliverability optimization.',
    },
  ];

  for (const pkg of packagesData) {
    await prisma.creditPackage.upsert({
      where: { id: pkg.id },
      update: {
        name: pkg.name,
        price: pkg.price,
        credits: pkg.credits,
        gstPercentage: pkg.gstPercentage,
        finalPrice: pkg.finalPrice,
        description: pkg.description,
      },
      create: {
        id: pkg.id,
        name: pkg.name,
        channel: pkg.channel,
        credits: pkg.credits,
        price: pkg.price,
        gstPercentage: pkg.gstPercentage,
        finalPrice: pkg.finalPrice,
        description: pkg.description,
        status: 'ACTIVE',
      },
    });
  }

  // 10. Initialize Pre-Funded Wallets for Demo Vendor (Part 3)
  console.log('Initializing Wallets for Demo Vendor...');
  const vendorsList = [demoVendor];
  const walletChannels = ['SMS', 'WHATSAPP', 'EMAIL'] as const;

  for (const v of vendorsList) {
    for (const ch of walletChannels) {
      await prisma.vendorWallet.upsert({
        where: {
          vendorId_channel: {
            vendorId: v.id,
            channel: ch,
          },
        },
        update: {
          availableCredits: 1000,
          totalPurchased: 1000,
        },
        create: {
          vendorId: v.id,
          channel: ch,
          availableCredits: 1000,
          reservedCredits: 0,
          totalPurchased: 1000,
          totalConsumed: 0,
          totalRefunded: 0,
        },
      });
    }
  }

  // 11. Seed Part 4: Communication Providers & Channel Pricing
  console.log('Seeding Part 4: Providers & Channel Pricing...');
  await prisma.providerConfiguration.upsert({
    where: { channel: 'SMS' },
    update: {},
    create: {
      channel: 'SMS',
      providerName: 'MSG91',
      isActive: true,
      isSandbox: true,
      credentials: {
        authKey: 'msg91_sandbox_key_demo_baash',
        senderId: 'BAASHG',
        dltEntityId: '1201159000000123456',
        defaultTemplateId: '64d23fa98e1b12345678',
      },
      lastTestedAt: new Date(),
      lastTestStatus: 'SUCCESS',
    },
  });

  await prisma.providerConfiguration.upsert({
    where: { channel: 'WHATSAPP' },
    update: {},
    create: {
      channel: 'WHATSAPP',
      providerName: 'META_WHATSAPP',
      isActive: true,
      isSandbox: true,
      credentials: {
        wabaId: '109827364519283',
        phoneNumberId: '102938475610293',
        accessToken: 'EAAG_sandbox_token_demo_meta_whatsapp',
        apiVersion: 'v21.0',
      },
      lastTestedAt: new Date(),
      lastTestStatus: 'SUCCESS',
    },
  });

  await prisma.providerConfiguration.upsert({
    where: { channel: 'EMAIL' },
    update: {},
    create: {
      channel: 'EMAIL',
      providerName: 'AMAZON_SES',
      isActive: true,
      isSandbox: true,
      credentials: {
        region: 'ap-south-1',
        accessKeyId: 'AKIA_SANDBOX_DEMO_KEY',
        secretAccessKey: 'aws_secret_sandbox_demo_value_12345',
        fromEmail: 'growth@baash.in',
      },
      lastTestedAt: new Date(),
      lastTestStatus: 'SUCCESS',
    },
  });

  // Channel Pricing
  await prisma.channelPricing.upsert({
    where: { channel: 'SMS' },
    update: {},
    create: {
      channel: 'SMS',
      sellingCreditsPerUnit: 1.0,
      estimatedProviderCost: 0.16,
    },
  });

  await prisma.channelPricing.upsert({
    where: { channel: 'WHATSAPP' },
    update: {},
    create: {
      channel: 'WHATSAPP',
      sellingCreditsPerUnit: 1.0,
      estimatedProviderCost: 0.45,
    },
  });

  await prisma.channelPricing.upsert({
    where: { channel: 'EMAIL' },
    update: {},
    create: {
      channel: 'EMAIL',
      sellingCreditsPerUnit: 1.0,
      estimatedProviderCost: 0.008,
    },
  });

  // 12. Seed Demo Campaign & Recipients
  console.log('Seeding Demo Campaign & Recipients...');
  const demoCampaign = await prisma.campaign.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      vendorId: demoVendor.id,
      name: 'Weekend Experience Welcome Special',
      channel: 'WHATSAPP',
      content: 'Hello {{name}}, thank you for joining Acme Studio! Get 20% off on your next booking.',
      status: 'COMPLETED',
      totalRecipients: 2,
      eligibleRecipients: 2,
      excludedRecipients: 0,
      sentCount: 2,
      deliveredCount: 2,
      readCount: 1,
      estimatedCredits: 2,
      reservedCredits: 0,
      consumedCredits: 2,
      releasedCredits: 0,
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3550000),
    },
  });

  await prisma.campaignRecipient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      campaignId: demoCampaign.id,
      customerId: customer1.id,
      destination: customer1.phone || '+919876543210',
      status: 'READ',
      providerMessageId: 'wamid.HBgLdemo_seed_msg_01',
      actualCredits: 1,
      renderedContent: 'Hello Rohan Mehra, thank you for joining Acme Studio! Get 20% off on your next booking.',
      submittedAt: new Date(Date.now() - 3590000),
      deliveredAt: new Date(Date.now() - 3580000),
      readAt: new Date(Date.now() - 3560000),
    },
  });

  await prisma.campaignRecipient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000022',
      campaignId: demoCampaign.id,
      customerId: customer2.id,
      destination: customer2.phone || '+919812345678',
      status: 'DELIVERED',
      providerMessageId: 'wamid.HBgLdemo_seed_msg_02',
      actualCredits: 1,
      renderedContent: 'Hello Ananya Deshmukh, thank you for joining Acme Studio! Get 20% off on your next booking.',
      submittedAt: new Date(Date.now() - 3590000),
      deliveredAt: new Date(Date.now() - 3575000),
    },
  });

  // 13. Seed Audit Log Entry
  await prisma.auditLog.create({
    data: {
      userId: superAdminUser.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'SYSTEM',
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/1.0',
      metadata: {
        message: 'System seeded with Part 1, Part 2 CRM, and Part 3 Wallet models',
      },
    },
  });

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
