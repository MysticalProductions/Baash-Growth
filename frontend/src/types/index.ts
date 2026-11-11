export * from './crm';
export * from './wallet';

export type RoleName = 'SUPER_ADMIN' | 'VENDOR_ADMIN' | 'VENDOR_STAFF';

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
export type VendorUserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: RoleName;
  vendorId?: string;
  vendorName?: string;
  permissions: string[];
}

export interface Vendor {
  id: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  businessLogo?: string;
  businessAddress?: string;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    vendorUsers: number;
    invitations: number;
    customers?: number;
    customerSegments?: number;
  };
}

export interface StaffMember {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  status: VendorUserStatus;
  userIsActive: boolean;
  role: string;
  roleDisplayName: string;
  customPermissions: string[];
  lastLoginAt?: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  vendorId: string;
  roleId: string;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  role?: {
    name: string;
    displayName: string;
  };
  invitedBy?: {
    fullName: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  userId?: string;
  vendorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
  };
  vendor?: {
    businessName: string;
  };
}
