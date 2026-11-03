import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AlarmProvider } from '@/context/AlarmContext';
import { Loading } from '@/components/ui';
import AppShell from '@/components/layout/AppShell';

export default function AppLayout() {
  const { user, restoring, isOwner, supportCompany } = useAuth();
  const { t } = useTheme();
  if (restoring) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (isOwner && !supportCompany) return <Redirect href="/owner-panel" />;
  return (
    <AlarmProvider>
      <AppShell>
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: t.hex.screen } }} />
      </AppShell>
    </AlarmProvider>
  );
}
