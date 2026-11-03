import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Loading } from '@/components/ui';
import { homeRoute } from '@/lib/session';

export default function Index() {
  const { user, restoring, isOwner, supportCompany } = useAuth();
  if (restoring) return <Loading />;
  return <Redirect href={user ? homeRoute(isOwner, !!supportCompany) : '/login'} />;
}
