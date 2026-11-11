import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segment.dto';
import { ConsentChannel } from '@prisma/client';

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  buildPrismaWhereFromFilters(vendorId: string, filters: Record<string, any>) {
    const where: any = { vendorId };

    if (!filters) return where;

    if (filters.city) {
      where.city = { contains: filters.city.trim(), mode: 'insensitive' };
    }
    if (filters.state) {
      where.state = { contains: filters.state.trim(), mode: 'insensitive' };
    }
    if (filters.gender) {
      where.gender = filters.gender;
    }
    if (filters.source) {
      where.source = filters.source;
    }
    if (filters.hasPhone !== undefined) {
      where.phone = filters.hasPhone ? { not: null } : null;
    }
    if (filters.hasEmail !== undefined) {
      where.email = filters.hasEmail ? { not: null } : null;
    }

    if (filters.tagIds && Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
      where.tagAssignments = {
        some: {
          tagId: { in: filters.tagIds },
        },
      };
    }

    const consentChecks: any[] = [];
    if (filters.smsConsent) {
      consentChecks.push({
        consents: {
          some: { channel: ConsentChannel.SMS, status: filters.smsConsent },
        },
      });
    }
    if (filters.whatsAppConsent) {
      consentChecks.push({
        consents: {
          some: { channel: ConsentChannel.WHATSAPP, status: filters.whatsAppConsent },
        },
      });
    }
    if (filters.emailConsent) {
      consentChecks.push({
        consents: {
          some: { channel: ConsentChannel.EMAIL, status: filters.emailConsent },
        },
      });
    }

    if (consentChecks.length > 0) {
      where.AND = [...(where.AND || []), ...consentChecks];
    }

    return where;
  }

  async getSegments(vendorId: string) {
    const segments = await this.prisma.customerSegment.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });

    // Dynamically calculate matching count for each segment
    const evaluatedSegments = await Promise.all(
      segments.map(async (seg) => {
        const where = this.buildPrismaWhereFromFilters(vendorId, seg.filters as any);
        const count = await this.prisma.customer.count({ where });
        return {
          ...seg,
          matchedCustomerCount: count,
        };
      }),
    );

    return evaluatedSegments;
  }

  async getSegmentById(vendorId: string, segmentId: string) {
    const seg = await this.prisma.customerSegment.findFirst({
      where: { id: segmentId, vendorId },
    });

    if (!seg) {
      throw new NotFoundException('Segment not found');
    }

    const where = this.buildPrismaWhereFromFilters(vendorId, seg.filters as any);
    const count = await this.prisma.customer.count({ where });

    return {
      ...seg,
      matchedCustomerCount: count,
    };
  }

  async getMatchingCustomers(
    vendorId: string,
    segmentId: string,
    page = 1,
    limit = 20,
  ) {
    const seg = await this.prisma.customerSegment.findFirst({
      where: { id: segmentId, vendorId },
    });

    if (!seg) {
      throw new NotFoundException('Segment not found');
    }

    const where = this.buildPrismaWhereFromFilters(vendorId, seg.filters as any);
    const skip = (Number(page) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          tagAssignments: { include: { tag: true } },
          consents: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      segment: {
        id: seg.id,
        name: seg.name,
        description: seg.description,
        filters: seg.filters,
      },
      customers: customers.map((c) => ({
        ...c,
        tags: c.tagAssignments.map((ta) => ta.tag),
      })),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async createSegment(vendorId: string, dto: CreateSegmentDto) {
    return this.prisma.customerSegment.create({
      data: {
        vendorId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        filters: dto.filters,
      },
    });
  }

  async updateSegment(vendorId: string, segmentId: string, dto: UpdateSegmentDto) {
    const seg = await this.prisma.customerSegment.findFirst({
      where: { id: segmentId, vendorId },
    });

    if (!seg) {
      throw new NotFoundException('Segment not found');
    }

    return this.prisma.customerSegment.update({
      where: { id: segmentId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        filters: dto.filters || undefined,
      },
    });
  }

  async deleteSegment(vendorId: string, segmentId: string) {
    const seg = await this.prisma.customerSegment.findFirst({
      where: { id: segmentId, vendorId },
    });

    if (!seg) {
      throw new NotFoundException('Segment not found');
    }

    await this.prisma.customerSegment.delete({
      where: { id: segmentId },
    });

    return { message: 'Segment deleted successfully' };
  }

  async previewFilters(vendorId: string, filters: Record<string, any>) {
    const where = this.buildPrismaWhereFromFilters(vendorId, filters || {});
    const [count, sample] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          tagAssignments: { include: { tag: true } },
          consents: true,
        },
      }),
    ]);
    return {
      matchedCount: count,
      sampleCustomers: sample.map((c) => ({
        ...c,
        tags: c.tagAssignments.map((ta) => ta.tag),
      })),
    };
  }
}
