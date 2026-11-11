import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        vendorUsers: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!user) {
      await this.auditService.log({
        action: 'FAILED_LOGIN',
        entityType: 'User',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'User not found' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await this.auditService.log({
        userId: user.id,
        action: 'FAILED_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        metadata: { email, reason: 'Invalid password credentials' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account has been deactivated. Please contact support.');
    }

    const primaryVendorUser = user.vendorUsers[0];
    const vendor = primaryVendorUser?.vendor;

    if (vendor && vendor.status === 'SUSPENDED') {
      throw new ForbiddenException('Your vendor workspace has been suspended. Please contact BAASH Platform Support.');
    }

    if (vendor && vendor.status === 'INACTIVE') {
      throw new ForbiddenException('Your vendor workspace is currently inactive.');
    }

    const primaryRole = user.userRoles[0]?.role?.name || 'VENDOR_STAFF';

    // Collect permissions
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.name);
      }
    }

    if (primaryVendorUser?.customPermissions && Array.isArray(primaryVendorUser.customPermissions)) {
      (primaryVendorUser.customPermissions as string[]).forEach((p) => permissionSet.add(p));
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: primaryRole,
      vendorId: vendor?.id,
      vendorName: vendor?.businessName,
      permissions: Array.from(permissionSet),
    };

    const tokens = await this.generateTokens(authUser);

    // Save refresh token hash
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await this.auditService.log({
      userId: user.id,
      vendorId: vendor?.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: { role: primaryRole, vendorId: vendor?.id },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: authUser,
    };
  }

  async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(refreshToken);

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
            vendorUsers: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!tokenRecord || !tokenRecord.user || !tokenRecord.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token rotation: revoke used refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const user = tokenRecord.user;
    const primaryVendorUser = user.vendorUsers[0];
    const vendor = primaryVendorUser?.vendor;
    const primaryRole = user.userRoles[0]?.role?.name || 'VENDOR_STAFF';

    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.name);
      }
    }
    if (primaryVendorUser?.customPermissions && Array.isArray(primaryVendorUser.customPermissions)) {
      (primaryVendorUser.customPermissions as string[]).forEach((p) => permissionSet.add(p));
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: primaryRole,
      vendorId: vendor?.id,
      vendorName: vendor?.businessName,
      permissions: Array.from(permissionSet),
    };

    const newTokens = await this.generateTokens(authUser);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    await this.auditService.log({
      userId: user.id,
      vendorId: vendor?.id,
      action: 'TOKEN_REFRESH',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      user: authUser,
    };
  }

  async logout(userId: string, refreshToken?: string, ipAddress?: string, userAgent?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    } else {
      // Invalidate all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    await this.auditService.log({
      userId,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // Return success message to avoid email enumeration
      return {
        message: 'If the email exists in our records, a password reset link has been dispatched.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpiresAt,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      message: 'If the email exists in our records, a password reset link has been dispatched.',
      resetToken, // Returned in API payload for development and testing verification
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiresAt: null,
      },
    });

    // Invalidate all active sessions upon password reset
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { message: 'Password has been updated successfully. Please log in with your new credentials.' };
  }

  async getMe(authUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        vendorUsers: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: authUser.role,
      vendor: user.vendorUsers[0]?.vendor || null,
      permissions: authUser.permissions,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(user: AuthenticatedUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      vendorId: user.vendorId,
      permissions: user.permissions,
    };

    const accessSecret = this.configService.get<string>(
      'JWT_SECRET',
      'baash_jwt_access_secret_key_change_in_production_2026',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'baash_jwt_refresh_secret_key_change_in_production_2026',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
