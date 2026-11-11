import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RoleName } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
}) => {
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-baash-black flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
        <p className="mt-4 text-baash-textMuted text-sm font-medium">Loading BAASH GROWTH...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If Admin tried to access vendor route or vice versa, redirect to their home
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/admin/overview" replace />;
    }
    return <Navigate to="/vendor/overview" replace />;
  }

  // Check permission authorization
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-baash-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <span className="text-2xl text-red-400">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-baash-textMuted max-w-md text-sm mb-6">
          Your account does not possess the required permission (<code className="text-baash-pink">{requiredPermission}</code>) to access this resource.
        </p>
        <button
          onClick={() => window.history.back()}
          className="baash-btn-outline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
