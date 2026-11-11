import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface AuditLogParams {
  userId?: string;
  vendorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          vendorId: params.vendorId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata || {},
        },
      });
    } catch (error) {
      // Never throw an exception that breaks core flows if an audit record write fails,
      // but log it with high severity.
      this.logger.error(`Failed to write audit log for action: ${params.action}`, error);
    }
  }

  async getLogs(params: {
    vendorId?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }) {
    const { vendorId, userId, action, entityType, limit = 50, offset = 0 } = params;
    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }
}
