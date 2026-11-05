import { useAuth } from '@/context/AuthContext';

export function useCanAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}
