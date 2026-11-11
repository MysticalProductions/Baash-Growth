import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  BulkDeleteDto,
  BulkTagDto,
  UpdateConsentDto,
} from './dto/customer.dto';
import { ConsentChannel, ConsentStatus, CustomerSource, MessageStatus } from '@prisma/client';

export interface CustomerQueryFilters {
  search?: string;
  tagIds?: string[];
  city?: string;
  state?: string;
  source?: CustomerSource;
  hasPhone?: boolean;
  hasEmail?: boolean;
  smsConsent?: ConsentStatus;
  whatsAppConsent?: ConsentStatus;
  emailConsent?: ConsentStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  normalizePhone(phone?: string): string | null {
    if (!phone) return null;
    const clean = phone.replace(/[\s\-\(\)\.]/g, '');
    if (!clean) return null;

    // Indian mobile standard check
    if (/^[6-9]\d{9}$/.test(clean)) {
      return `+91${clean}`;
    }
    if (/^0[6-9]\d{9}$/.test(clean)) {
      return `+91${clean.substring(1)}`;
    }
    if (/^91[6-9]\d{9}$/.test(clean)) {
      return `+${clean}`;
    }
    if (clean.startsWith('+')) {
      return clean;
    }
    return `+${clean}`;
  }

  normalizeEmail(email?: string): string | null {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    return clean || null;
  }

  async getCustomers(vendorId: string, filters: CustomerQueryFilters) {
    const {
      search,
      tagIds,
      city,
      state,
      source,
      hasPhone,
      hasEmail,
      smsConsent,
      whatsAppConsent,
      emailConsent,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { vendorId };

    // Search query
    if (search) {
      const s = search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city.trim(), mode: 'insensitive' };
    }
    if (state) {
      where.state = { contains: state.trim(), mode: 'insensitive' };
    }
    if (source) {
      where.source = source;
    }
    if (hasPhone !== undefined) {
      where.phone = hasPhone ? { not: null } : null;
    }
    if (hasEmail !== undefined) {
      where.email = hasEmail ? { not: null } : null;
    }

    // Filter by tags
    if (tagIds && tagIds.length > 0) {
      where.tagAssignments = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    // Filter by consent
    const consentConditions: any[] = [];
    if (smsConsent) {
      consentConditions.push({
        consents: {
          some: { channel: ConsentChannel.SMS, status: smsConsent },
        },
      });
    }
    if (whatsAppConsent) {
      consentConditions.push({
        consents: {
          some: { channel: ConsentChannel.WHATSAPP, status: whatsAppConsent },
        },
      });
    }
    if (emailConsent) {
      consentConditions.push({
        consents: {
          some: { channel: ConsentChannel.EMAIL, status: emailConsent },
        },
      });
    }
    if (consentConditions.length > 0) {
      where.AND = [...(where.AND || []), ...consentConditions];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          tagAssignments: {
            include: { tag: true },
          },
          consents: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const formatted = customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      gender: c.gender,
      dateOfBirth: c.dateOfBirth,
      city: c.city,
      state: c.state,
      source: c.source,
      notes: c.notes,
      tags: c.tagAssignments.map((ta) => ta.tag),
      consents: c.consents,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      customers: formatted,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async getCustomerById(vendorId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, vendorId },
      include: {
        tagAssignments: {
          include: { tag: true },
        },
        consents: true,
        messageHistory: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in your workspace');
    }

    return {
      ...customer,
      tags: customer.tagAssignments.map((ta) => ta.tag),
    };
  }

  async createCustomer(
    vendorId: string,
    dto: CreateCustomerDto,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const normalizedPhone = this.normalizePhone(dto.phone);
    const normalizedEmail = this.normalizeEmail(dto.email);

    if (!normalizedPhone && !normalizedEmail) {
      throw new BadRequestException('At least one valid contact method (mobile number or email) is required');
    }

    // Duplicate detection within the same vendor
    if (!dto.allowDuplicateConfirmed) {
      const duplicateConditions: any[] = [];
      if (normalizedPhone) duplicateConditions.push({ phone: normalizedPhone });
      if (normalizedEmail) duplicateConditions.push({ email: normalizedEmail });

      const existing = await this.prisma.customer.findFirst({
        where: {
          vendorId,
          OR: duplicateConditions,
        },
      });

      if (existing) {
        throw new ConflictException({
          duplicate: true,
          existingCustomer: {
            id: existing.id,
            fullName: existing.fullName,
            phone: existing.phone,
            email: existing.email,
          },
          message: `A customer with this ${
            existing.phone === normalizedPhone ? 'mobile number' : 'email address'
          } already exists in your workspace. You may confirm to proceed if this is a shared contact.`,
        });
      }
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      // 1. Create customer
      const newCustomer = await tx.customer.create({
        data: {
          vendorId,
          fullName: dto.fullName.trim(),
          phone: normalizedPhone,
          email: normalizedEmail,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          city: dto.city?.trim(),
          state: dto.state?.trim(),
          source: dto.source || CustomerSource.MANUAL_ENTRY,
          notes: dto.notes?.trim(),
        },
      });

      // 2. Link tags
      if (dto.tagIds && dto.tagIds.length > 0) {
        for (const tagId of dto.tagIds) {
          await tx.customerTagAssignment.create({
            data: {
              customerId: newCustomer.id,
              tagId,
            },
          });
        }
      }

      // 3. Initialize consents
      const channels = [ConsentChannel.SMS, ConsentChannel.WHATSAPP, ConsentChannel.EMAIL];
      for (const channel of channels) {
        await tx.customerConsent.create({
          data: {
            customerId: newCustomer.id,
            channel,
            status: ConsentStatus.UNKNOWN,
            source: dto.source || 'MANUAL_ENTRY',
          },
        });
      }

      // 4. Create sample initial interaction history record
      await tx.messageHistory.create({
        data: {
          vendorId,
          customerId: newCustomer.id,
          channel: ConsentChannel.WHATSAPP,
          campaignName: 'Welcome Experience Onboarding',
          messageContent: `Welcome ${dto.fullName.trim()}! Thank you for connecting with us.`,
          status: MessageStatus.DELIVERED,
          isDemo: true,
        },
      });

      return newCustomer;
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      ipAddress: ip,
      userAgent,
      metadata: { fullName: customer.fullName, phone: customer.phone, email: customer.email },
    });

    return this.getCustomerById(vendorId, customer.id);
  }

  async updateCustomer(
    vendorId: string,
    customerId: string,
    dto: UpdateCustomerDto,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, vendorId },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const normalizedPhone = dto.phone !== undefined ? this.normalizePhone(dto.phone) : existing.phone;
    const normalizedEmail = dto.email !== undefined ? this.normalizeEmail(dto.email) : existing.email;

    if (!normalizedPhone && !normalizedEmail) {
      throw new BadRequestException('At least one valid contact method (mobile number or email) is required');
    }

    // Duplicate check if phone or email changed
    if (!dto.allowDuplicateConfirmed) {
      const dupChecks: any[] = [];
      if (normalizedPhone && normalizedPhone !== existing.phone) {
        dupChecks.push({ phone: normalizedPhone });
      }
      if (normalizedEmail && normalizedEmail !== existing.email) {
        dupChecks.push({ email: normalizedEmail });
      }

      if (dupChecks.length > 0) {
        const conflict = await this.prisma.customer.findFirst({
          where: {
            vendorId,
            id: { not: customerId },
            OR: dupChecks,
          },
        });

        if (conflict) {
          throw new ConflictException({
            duplicate: true,
            existingCustomer: {
              id: conflict.id,
              fullName: conflict.fullName,
              phone: conflict.phone,
              email: conflict.email,
            },
            message: 'Another customer with this phone or email already exists in your workspace.',
          });
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
          phone: normalizedPhone,
          email: normalizedEmail,
          gender: dto.gender !== undefined ? dto.gender : undefined,
          dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : undefined,
          city: dto.city !== undefined ? dto.city?.trim() : undefined,
          state: dto.state !== undefined ? dto.state?.trim() : undefined,
          source: dto.source !== undefined ? dto.source : undefined,
          notes: dto.notes !== undefined ? dto.notes?.trim() : undefined,
        },
      });

      if (dto.tagIds !== undefined) {
        await tx.customerTagAssignment.deleteMany({
          where: { customerId },
        });

        for (const tagId of dto.tagIds) {
          await tx.customerTagAssignment.create({
            data: { customerId, tagId },
          });
        }
      }
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: customerId,
      ipAddress: ip,
      userAgent,
      metadata: { changes: dto },
    });

    return this.getCustomerById(vendorId, customerId);
  }

  async deleteCustomer(vendorId: string, customerId: string, userId?: string, ip?: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, vendorId },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    await this.prisma.customer.delete({
      where: { id: customerId },
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: customerId,
      ipAddress: ip,
      metadata: { fullName: existing.fullName },
    });

    return { message: 'Customer deleted successfully' };
  }

  async bulkDelete(vendorId: string, dto: BulkDeleteDto, userId?: string, ip?: string) {
    const count = await this.prisma.customer.deleteMany({
      where: {
        vendorId,
        id: { in: dto.customerIds },
      },
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'CUSTOMERS_BULK_DELETED',
      entityType: 'Customer',
      ipAddress: ip,
      metadata: { count: count.count, customerIds: dto.customerIds },
    });

    return { message: `${count.count} customers removed successfully` };
  }

  async bulkTag(vendorId: string, dto: BulkTagDto, userId?: string) {
    const { customerIds, tagIds, action = 'add' } = dto;

    if (action === 'replace') {
      await this.prisma.customerTagAssignment.deleteMany({
        where: { customerId: { in: customerIds } },
      });
      for (const cid of customerIds) {
        for (const tid of tagIds) {
          await this.prisma.customerTagAssignment.create({
            data: { customerId: cid, tagId: tid },
          });
        }
      }
    } else if (action === 'remove') {
      await this.prisma.customerTagAssignment.deleteMany({
        where: {
          customerId: { in: customerIds },
          tagId: { in: tagIds },
        },
      });
    } else {
      // Add tags without creating duplicates
      for (const cid of customerIds) {
        for (const tid of tagIds) {
          await this.prisma.customerTagAssignment.upsert({
            where: {
              customerId_tagId: { customerId: cid, tagId: tid },
            },
            update: {},
            create: { customerId: cid, tagId: tid },
          });
        }
      }
    }

    return { message: `Tags updated for ${customerIds.length} customers` };
  }

  async getConsent(vendorId: string, customerId: string) {
    await this.getCustomerById(vendorId, customerId);
    return this.prisma.customerConsent.findMany({
      where: { customerId },
    });
  }

  async updateConsent(
    vendorId: string,
    customerId: string,
    dto: UpdateConsentDto,
    userId?: string,
    ip?: string,
  ) {
    await this.getCustomerById(vendorId, customerId);

    const now = new Date();
    const consent = await this.prisma.customerConsent.upsert({
      where: {
        customerId_channel: {
          customerId,
          channel: dto.channel,
        },
      },
      update: {
        status: dto.status,
        source: dto.source || undefined,
        notes: dto.notes || undefined,
        consentTimestamp: dto.status === ConsentStatus.OPTED_IN ? now : undefined,
        optOutTimestamp: dto.status === ConsentStatus.OPTED_OUT ? now : undefined,
      },
      create: {
        customerId,
        channel: dto.channel,
        status: dto.status,
        source: dto.source || 'MANUAL',
        notes: dto.notes,
        consentTimestamp: dto.status === ConsentStatus.OPTED_IN ? now : null,
        optOutTimestamp: dto.status === ConsentStatus.OPTED_OUT ? now : null,
      },
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'CONSENT_UPDATED',
      entityType: 'CustomerConsent',
      entityId: consent.id,
      ipAddress: ip,
      metadata: { channel: dto.channel, status: dto.status },
    });

    return consent;
  }

  async getMessageHistory(vendorId: string, customerId: string) {
    await this.getCustomerById(vendorId, customerId);
    return this.prisma.messageHistory.findMany({
      where: { vendorId, customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async exportCustomersCsv(vendorId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      include: {
        tagAssignments: { include: { tag: true } },
        consents: true,
      },
    });

    const headers = [
      'Customer ID',
      'Full Name',
      'Mobile Phone',
      'Email Address',
      'Gender',
      'Date of Birth',
      'City',
      'State',
      'Source',
      'Tags',
      'SMS Consent',
      'WhatsApp Consent',
      'Email Consent',
      'Notes',
      'Created Date',
    ];

    const rows = customers.map((c) => {
      const tags = c.tagAssignments.map((t) => t.tag.name).join('; ');
      const sms = c.consents.find((x) => x.channel === ConsentChannel.SMS)?.status || 'UNKNOWN';
      const wa = c.consents.find((x) => x.channel === ConsentChannel.WHATSAPP)?.status || 'UNKNOWN';
      const em = c.consents.find((x) => x.channel === ConsentChannel.EMAIL)?.status || 'UNKNOWN';

      return [
        `"${c.id}"`,
        `"${c.fullName.replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        `"${c.email || ''}"`,
        `"${c.gender || ''}"`,
        `"${c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : ''}"`,
        `"${(c.city || '').replace(/"/g, '""')}"`,
        `"${(c.state || '').replace(/"/g, '""')}"`,
        `"${c.source}"`,
        `"${tags}"`,
        `"${sms}"`,
        `"${wa}"`,
        `"${em}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        `"${c.createdAt.toISOString()}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
