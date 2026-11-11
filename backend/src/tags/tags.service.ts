import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTags(vendorId: string) {
    return this.prisma.customerTag.findMany({
      where: { vendorId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  async createTag(vendorId: string, dto: CreateTagDto) {
    const existing = await this.prisma.customerTag.findUnique({
      where: {
        vendorId_name: {
          vendorId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Tag '${dto.name}' already exists in your workspace`);
    }

    return this.prisma.customerTag.create({
      data: {
        vendorId,
        name: dto.name.trim(),
        color: dto.color || '#7B35E8',
      },
    });
  }

  async updateTag(vendorId: string, tagId: string, dto: UpdateTagDto) {
    const tag = await this.prisma.customerTag.findFirst({
      where: { id: tagId, vendorId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (dto.name && dto.name.trim() !== tag.name) {
      const existing = await this.prisma.customerTag.findUnique({
        where: {
          vendorId_name: {
            vendorId,
            name: dto.name.trim(),
          },
        },
      });
      if (existing) {
        throw new ConflictException(`Tag '${dto.name}' already exists in your workspace`);
      }
    }

    return this.prisma.customerTag.update({
      where: { id: tagId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        color: dto.color || undefined,
      },
    });
  }

  async deleteTag(vendorId: string, tagId: string) {
    const tag = await this.prisma.customerTag.findFirst({
      where: { id: tagId, vendorId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.customerTag.delete({
      where: { id: tagId },
    });

    return { message: 'Tag deleted successfully' };
  }
}
