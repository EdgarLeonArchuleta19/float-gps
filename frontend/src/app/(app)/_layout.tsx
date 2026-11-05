import { Platform } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AlarmProvider } from '@/context/AlarmContext';
import { Loading } from '@/components/ui';
import AppShell from '@/components/layout/AppShell';

export default function AppLayout() {
  const { user, staff, restoring } = useAuth();
  const { t } = useTheme();
  if (restoring) return <Loading />;
  if (staff && !user) return <Redirect href="/console" />;
  if (!user) return <Redirect href="/login" />;
  if (user.mustChangePassword) return <Redirect href="/set-password" />;
  return (
    <AlarmProvider>
      <AppShell>
        <Stack screenOptions={{ headerShown: false, animation: Platform.OS === 'web' ? 'fade' : 'fade_from_bottom', contentStyle: { backgroundColor: t.hex.screen } }} />
      </AppShell>
    </AlarmProvider>
  );
}
