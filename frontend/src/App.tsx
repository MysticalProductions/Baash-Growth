import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { VendorLayout } from './layouts/VendorLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AcceptInvitationPage } from './pages/auth/AcceptInvitationPage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminVendorsPage } from './pages/admin/AdminVendorsPage';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';
import { CreditPackagesPage } from './pages/admin/CreditPackagesPage';
import { AdminWalletsPage } from './pages/admin/AdminWalletsPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';
import { AdminProvidersPage } from './pages/admin/AdminProvidersPage';
import { AdminPricingPage } from './pages/admin/AdminPricingPage';
import { AdminCampaignsPage } from './pages/admin/AdminCampaignsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminReconciliationPage } from './pages/admin/AdminReconciliationPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Vendor Pages
import { VendorOverviewPage } from './pages/vendor/VendorOverviewPage';
import { VendorStaffPage } from './pages/vendor/VendorStaffPage';
import { VendorSettingsPage } from './pages/vendor/VendorSettingsPage';
import { VendorPlaceholderPage } from './pages/vendor/VendorPlaceholderPage';
import { CustomersListingPage } from './pages/vendor/crm/CustomersListingPage';
import { CustomerProfilePage } from './pages/vendor/crm/CustomerProfilePage';
import { SegmentsListingPage } from './pages/vendor/crm/SegmentsListingPage';
import { TemplatesListingPage } from './pages/vendor/crm/TemplatesListingPage';
import { VendorWalletPage } from './pages/vendor/wallet/VendorWalletPage';
import { VendorTransactionsPage } from './pages/vendor/wallet/VendorTransactionsPage';
import { CampaignsListingPage } from './pages/vendor/campaigns/CampaignsListingPage';
import { CreateCampaignPage } from './pages/vendor/campaigns/CreateCampaignPage';
import { CampaignDetailPage } from './pages/vendor/campaigns/CampaignDetailPage';
import { VendorAnalyticsPage } from './pages/vendor/analytics/VendorAnalyticsPage';

// Icons for placeholders
import {
  Radio,
  Package,
  CircleDollarSign,
  Receipt,
  Megaphone,
  BarChart3,
  Settings,
  Users,
  Filter,
  FileText,
  Wallet,
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-baash-black flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
        <p className="mt-4 text-baash-textMuted text-sm font-medium">Initializing BAASH GROWTH...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root Redirection */}
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : user?.role === 'SUPER_ADMIN' ? (
            <Navigate to="/admin/overview" replace />
          ) : (
            <Navigate to="/vendor/overview" replace />
          )
        }
      />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      </Route>

      {/* Admin Console Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="vendors" element={<AdminVendorsPage />} />
        <Route path="providers" element={<AdminProvidersPage />} />
        <Route path="pricing" element={<AdminPricingPage />} />
        <Route path="credit-packages" element={<CreditPackagesPage />} />
        <Route path="packages" element={<Navigate to="/admin/credit-packages" replace />} />
        <Route path="wallets" element={<AdminWalletsPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="reconciliation" element={<AdminReconciliationPage />} />
        <Route path="campaigns" element={<AdminCampaignsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Vendor Workspace Routes */}
      <Route
        path="/vendor"
        element={
          <ProtectedRoute allowedRoles={['VENDOR_ADMIN', 'VENDOR_STAFF']}>
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/vendor/overview" replace />} />
        <Route path="overview" element={<VendorOverviewPage />} />
        <Route path="customers" element={<CustomersListingPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="segments" element={<SegmentsListingPage />} />
        <Route path="templates" element={<TemplatesListingPage />} />
        <Route path="campaigns" element={<CampaignsListingPage />} />
        <Route path="campaigns/create" element={<CreateCampaignPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="wallet" element={<VendorWalletPage />} />
        <Route path="transactions" element={<VendorTransactionsPage />} />
        <Route path="analytics" element={<VendorAnalyticsPage />} />
        <Route path="team" element={<VendorStaffPage />} />
        <Route path="settings" element={<VendorSettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
