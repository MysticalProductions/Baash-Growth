import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from './current-user.decorator';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role === 'SUPER_ADMIN') {
      // Super admin can specify a tenant via header if simulating, or returns null for platform view
      const targetVendorId = request.headers['x-vendor-id'] as string || request.query?.vendorId;
      return targetVendorId || null;
    }

    if (!user.vendorId) {
      throw new UnauthorizedException('User is not associated with an active vendor workspace');
    }

    return user.vendorId;
  },
);
