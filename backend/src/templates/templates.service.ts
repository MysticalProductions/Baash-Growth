import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { TemplateChannel, MetaApprovalStatus } from '@prisma/client';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  extractVariables(text: string): string[] {
    const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/[\{\}]/g, ''))));
  }

  calculateSmsSegments(text: string): { characterCount: number; segmentCount: number } {
    const len = text.length;
    // Standard GSM 7-bit single segment is 160 chars; multi-part is 153 chars per segment
    if (len <= 160) {
      return { characterCount: len, segmentCount: len > 0 ? 1 : 0 };
    }
    const segmentCount = Math.ceil(len / 153);
    return { characterCount: len, segmentCount };
  }

  async getTemplates(vendorId: string, channel?: TemplateChannel) {
    const where: any = {
      OR: [
        { vendorId },
        { vendorId: null }, // Global system templates provided by platform
      ],
    };

    if (channel && (channel as any) !== 'ALL') {
      where.channel = channel;
    }

    const templates = await this.prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => {
      let smsStats;
      if (t.channel === TemplateChannel.SMS) {
        smsStats = this.calculateSmsSegments(t.content);
      }
      return {
        ...t,
        smsStats,
      };
    });
  }

  async getTemplateById(vendorId: string, templateId: string) {
    const t = await this.prisma.messageTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ vendorId }, { vendorId: null }],
      },
    });

    if (!t) {
      throw new NotFoundException('Template not found');
    }

    let smsStats;
    if (t.channel === TemplateChannel.SMS) {
      smsStats = this.calculateSmsSegments(t.content);
    }

    return {
      ...t,
      smsStats,
    };
  }

  async createTemplate(vendorId: string, dto: CreateTemplateDto) {
    const allText = `${dto.subject || ''} ${dto.content}`;
    const variables = this.extractVariables(allText);

    return this.prisma.messageTemplate.create({
      data: {
        vendorId,
        channel: dto.channel,
        name: dto.name.trim(),
        category: dto.category,
        language: dto.language || 'en',
        subject: dto.subject?.trim(),
        content: dto.content.trim(),
        plainTextContent: dto.plainTextContent?.trim(),
        metaStatus: MetaApprovalStatus.DRAFT,
        variables,
      },
    });
  }

  async updateTemplate(vendorId: string, templateId: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, vendorId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found or cannot be modified');
    }

    const content = dto.content !== undefined ? dto.content.trim() : existing.content;
    const subject = dto.subject !== undefined ? dto.subject?.trim() : existing.subject;
    const allText = `${subject || ''} ${content}`;
    const variables = this.extractVariables(allText);

    return this.prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        category: dto.category !== undefined ? dto.category : undefined,
        language: dto.language || undefined,
        subject,
        content,
        plainTextContent: dto.plainTextContent !== undefined ? dto.plainTextContent?.trim() : undefined,
        variables,
      },
    });
  }

  async deleteTemplate(vendorId: string, templateId: string) {
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, vendorId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found or cannot be deleted');
    }

    await this.prisma.messageTemplate.delete({
      where: { id: templateId },
    });

    return { message: 'Template deleted successfully' };
  }
}
