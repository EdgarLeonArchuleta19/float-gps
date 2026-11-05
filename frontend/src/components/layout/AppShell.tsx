import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, usePathname } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useCan } from '@/hooks/useCan';
import { routePermission } from '@/lib/permissions';
import Sidebar from './Sidebar';
import DesktopTopBar from './DesktopTopBar';
import MobileTopBar from './MobileTopBar';
import BottomTabBar from './BottomTabBar';
import SupportBanner from './SupportBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const { t } = useTheme();
  const can = useCan();
  const canAlerts = can('alerts');
  const { data } = useApi(() => (canAlerts ? api.dashboard.getStats() : Promise.resolve(null)), [canAlerts], { pollMs: 60000 });
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const alerts = data?.alertsCount ?? 0;
  const required = routePermission(pathname);

  if (required && !can(required)) return <Redirect href="/live-map" />;

  if (isDesktop) {
    return (
      <View className={`flex-1 flex-row ${t.screen}`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} alerts={alerts} />
        <View className="flex-1">
          <SupportBanner />
          <DesktopTopBar alerts={alerts} />
          <View className="flex-1">{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${t.screen}`}>
      <MobileTopBar alerts={alerts} />
      <SupportBanner />
      <View className="flex-1">{children}</View>
      <BottomTabBar alerts={alerts} />
    </View>
  );
}
