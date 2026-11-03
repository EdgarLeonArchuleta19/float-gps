import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import Sidebar from './Sidebar';
import DesktopTopBar from './DesktopTopBar';
import MobileTopBar from './MobileTopBar';
import BottomTabBar from './BottomTabBar';
import SupportBanner from './SupportBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const { t } = useTheme();
  const { data } = useApi(() => api.dashboard.getStats(), [], { pollMs: 60000 });
  const alerts = data?.alertsCount ?? 0;
  const [collapsed, setCollapsed] = useState(false);

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
