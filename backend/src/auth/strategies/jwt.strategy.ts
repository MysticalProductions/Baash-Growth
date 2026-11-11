import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.accessToken || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'baash_jwt_access_secret_key_change_in_production_2026'),
    });
  }

  async validate(payload: any): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    const primaryRole = user.userRoles[0]?.role?.name || 'VENDOR_STAFF';

    // Collect base role permissions
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.name);
      }
    }

    // Identify vendor context
    const primaryVendorUser = user.vendorUsers[0];
    const vendor = primaryVendorUser?.vendor;

    // Apply custom permission overrides for staff if defined
    if (primaryVendorUser?.customPermissions && Array.isArray(primaryVendorUser.customPermissions)) {
      (primaryVendorUser.customPermissions as string[]).forEach((p) => permissionSet.add(p));
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: primaryRole,
      vendorId: vendor?.id,
      vendorName: vendor?.businessName,
      permissions: Array.from(permissionSet),
    };
  }
}
