import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { TAB_OVERHANG } from '@/components/layout/FeaturedTab';

export default function ActionFooter({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  return (
    <View className={`border-t px-4 pt-3 ${t.card} ${t.border}`} style={{ paddingBottom: isDesktop ? 12 : 12 + TAB_OVERHANG }}>
      <View className="w-full max-w-[720px] self-center flex-row gap-2">{children}</View>
    </View>
  );
}
