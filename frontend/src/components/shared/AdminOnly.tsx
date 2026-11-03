import React from 'react';
import { Redirect } from 'expo-router';
import { useCanAdmin } from '@/hooks/useCanAdmin';

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const canAdmin = useCanAdmin();
  if (!canAdmin) return <Redirect href="/more" />;
  return <>{children}</>;
}
