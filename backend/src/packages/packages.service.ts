import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletChannel, PackageStatus, Prisma } from '@prisma/client';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to dynamically calculate GST and final price
   */
  calculateFinancials(price: number, gstPercentage = 18.0) {
    const basePrice = new Prisma.Decimal(price).toDecimalPlaces(2);
    const gstRate = new Prisma.Decimal(gstPercentage).toDecimalPlaces(2);
    const gstAmount = basePrice.mul(gstRate).div(100).toDecimalPlaces(2);
    const finalPrice = basePrice.plus(gstAmount).toDecimalPlaces(2);

    return {
      price: basePrice,
      gstPercentage: gstRate,
      gstAmount,
      finalPrice,
    };
  }

  /**
   * Vendor API: List active packages for a given channel or all channels.
   */
  async getActivePackages(channel?: WalletChannel) {
    const where: Prisma.CreditPackageWhereInput = {
      status: PackageStatus.ACTIVE,
    };

    if (channel && (channel as any) !== 'ALL') {
      where.channel = channel;
    }

    const packages = await this.prisma.creditPackage.findMany({
      where,
      orderBy: [{ channel: 'asc' }, { price: 'asc' }],
    });

    return packages.map((pkg) => {
      const calc = this.calculateFinancials(Number(pkg.price), Number(pkg.gstPercentage));
      return {
        ...pkg,
        price: Number(pkg.price),
        gstPercentage: Number(pkg.gstPercentage),
        gstAmount: Number(calc.gstAmount),
        finalPrice: Number(pkg.finalPrice),
      };
    });
  }

  /**
   * Retrieve single package details by ID.
   */
  async getPackageById(packageId: string) {
    const pkg = await this.prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Credit package not found');
    }

    const calc = this.calculateFinancials(Number(pkg.price), Number(pkg.gstPercentage));
    return {
      ...pkg,
      price: Number(pkg.price),
      gstPercentage: Number(pkg.gstPercentage),
      gstAmount: Number(calc.gstAmount),
      finalPrice: Number(pkg.finalPrice),
    };
  }

  /**
   * Admin API: List all packages (active & inactive) with purchase counts.
   */
  async getAllAdminPackages() {
    const packages = await this.prisma.creditPackage.findMany({
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: [{ status: 'asc' }, { channel: 'asc' }, { price: 'asc' }],
    });

    return packages.map((pkg) => {
      const calc = this.calculateFinancials(Number(pkg.price), Number(pkg.gstPercentage));
      return {
        ...pkg,
        price: Number(pkg.price),
        gstPercentage: Number(pkg.gstPercentage),
        gstAmount: Number(calc.gstAmount),
        finalPrice: Number(pkg.finalPrice),
        purchaseCount: pkg._count?.purchases || 0,
      };
    });
  }

  /**
   * Admin API: Create a new credit package with dynamic GST calculations.
   */
  async createPackage(dto: CreatePackageDto) {
    const financials = this.calculateFinancials(dto.price, dto.gstPercentage ?? 18.0);

    const created = await this.prisma.creditPackage.create({
      data: {
        name: dto.name.trim(),
        channel: dto.channel,
        credits: dto.credits,
        price: financials.price,
        gstPercentage: financials.gstPercentage,
        finalPrice: financials.finalPrice,
        description: dto.description?.trim(),
        status: PackageStatus.ACTIVE,
      },
    });

    return {
      ...created,
      price: Number(created.price),
      gstPercentage: Number(created.gstPercentage),
      gstAmount: Number(financials.gstAmount),
      finalPrice: Number(created.finalPrice),
    };
  }

  /**
   * Admin API: Update package details and recompute final price dynamically.
   */
  async updatePackage(packageId: string, dto: UpdatePackageDto) {
    const existing = await this.prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!existing) {
      throw new NotFoundException('Credit package not found');
    }

    const targetPrice = dto.price !== undefined ? dto.price : Number(existing.price);
    const targetGst =
      dto.gstPercentage !== undefined ? dto.gstPercentage : Number(existing.gstPercentage);

    const financials = this.calculateFinancials(targetPrice, targetGst);

    const updated = await this.prisma.creditPackage.update({
      where: { id: packageId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        channel: dto.channel || undefined,
        credits: dto.credits !== undefined ? dto.credits : undefined,
        price: financials.price,
        gstPercentage: financials.gstPercentage,
        finalPrice: financials.finalPrice,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        status: dto.status || undefined,
      },
    });

    return {
      ...updated,
      price: Number(updated.price),
      gstPercentage: Number(updated.gstPercentage),
      gstAmount: Number(financials.gstAmount),
      finalPrice: Number(updated.finalPrice),
    };
  }

  /**
   * Admin API: Toggle active/inactive status.
   */
  async updatePackageStatus(packageId: string, status: PackageStatus) {
    const existing = await this.prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!existing) {
      throw new NotFoundException('Credit package not found');
    }

    return this.prisma.creditPackage.update({
      where: { id: packageId },
      data: { status },
    });
  }
}
