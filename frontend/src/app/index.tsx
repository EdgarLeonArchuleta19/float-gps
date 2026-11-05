import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Loading } from '@/components/ui';
import { homeRoute } from '@/lib/session';

export default function Index() {
  const { user, staff, restoring, support } = useAuth();
  if (restoring) return <Loading />;
  return <Redirect href={user || staff ? homeRoute(!!staff, !!support) : '/login'} />;
}
