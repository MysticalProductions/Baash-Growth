import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Super Admin has multi-tenant oversight
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.vendorId) {
      throw new ForbiddenException('User is not associated with an active vendor workspace');
    }

    // Check if route params contain vendorId or id that would indicate target vendor
    const paramVendorId = request.params?.vendorId;
    if (paramVendorId && paramVendorId !== user.vendorId) {
      throw new ForbiddenException('Cross-tenant data access is strictly prohibited');
    }

    // Never trust vendor_id sent directly in request body for vendor users:
    // Always force the body to use the authenticated user's tenant ID
    if (request.body && typeof request.body === 'object') {
      if (request.body.vendorId && request.body.vendorId !== user.vendorId) {
        throw new ForbiddenException('Cross-tenant data modification is strictly prohibited');
      }
      request.body.vendorId = user.vendorId;
    }

    return true;
  }
}
