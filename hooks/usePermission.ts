import { useAuthStore } from '@/lib/store';
import { hasPermission, hasAnyPermission, getRoleMenuItems, getRoleLabel } from '@/lib/roles';

export const usePermission = () => {
  const { user } = useAuthStore();

  const can = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const canAny = (permissions: string[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user.role, permissions);
  };

  const canAll = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(p => hasPermission(user.role, p));
  };

  const isRole = (role: string | string[]): boolean => {
    if (!user) return false;
    if (typeof role === 'string') {
      return user.role === role;
    }
    return role.includes(user.role);
  };

  const isAdmin = (): boolean => {
    return isRole('admin');
  };

  const getMenuItems = (): string[] => {
    if (!user) return [];
    return getRoleMenuItems(user.role);
  };

  const getRoleLabelValue = (): string => {
    if (!user) return '';
    return getRoleLabel(user.role);
  };

  return {
    can,
    canAny,
    canAll,
    isRole,
    isAdmin,
    getMenuItems,
    getRoleLabel: getRoleLabelValue,
    user,
  };
};
