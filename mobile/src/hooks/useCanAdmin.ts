import { useAuth } from '@/context/AuthContext';

export function useCanAdmin() {
  const { user, isOwner } = useAuth();
  return isOwner || user?.role === 'admin';
}
