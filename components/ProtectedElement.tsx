import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Alert } from '@/components/Alert';

interface ProtectedElementProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string | string[];
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render content based on user permissions
 * 
 * @example
 * // Show only if user has permission
 * <ProtectedElement permission="create_patients">
 *   <CreatePatientButton />
 * </ProtectedElement>
 * 
 * @example
 * // Show if user has any of the permissions
 * <ProtectedElement permissions={['edit_patients', 'create_patients']}>
 *   <PatientActions />
 * </ProtectedElement>
 * 
 * @example
 * // Show only for specific roles
 * <ProtectedElement role={['admin', 'doctor']}>
 *   <AdminPanel />
 * </ProtectedElement>
 */
export const ProtectedElement = ({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
}: ProtectedElementProps) => {
  const { can, canAny, canAll, isRole } = usePermission();

  let hasAccess = false;

  if (role) {
    hasAccess = isRole(role);
  } else if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean;
}

/**
 * Component to protect entire pages from unauthorized access
 * Redirects to dashboard or shows error if user doesn't have access
 */
export const ProtectedPage = ({
  children,
  requiredRoles,
  requiredPermissions,
  requireAll = false,
}: ProtectedPageProps) => {
  const { user, canAny, canAll, isRole } = usePermission();

  let hasAccess = true;

  if (requiredRoles) {
    hasAccess = isRole(requiredRoles);
  } else if (requiredPermissions) {
    hasAccess = requireAll
      ? canAll(requiredPermissions)
      : canAny(requiredPermissions);
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert type="error" message="Not Authenticated: Please log in to access this page." />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert 
          type="error" 
          message={`Access Denied: You do not have permission to access this page. Your current role is ${user.role}.`}
        />
      </div>
    );
  }

  return <>{children}</>;
};
