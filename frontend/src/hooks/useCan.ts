import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Permission } from '@/lib/permissions';

export function useCan() {
  const { user } = useAuth();
  const permissions = user?.permissions;
  return useCallback((permission: Permission) => permissions == null || permissions.includes(permission), [permissions]);
}
