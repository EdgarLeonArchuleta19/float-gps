import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Tappable from '@/components/shared/Tappable';
import { goTo, isActive, useMainTabs } from './navItems';
import FeaturedTab from './FeaturedTab';

const NATIVE = Platform.OS !== 'web';

function TabItem({ icon: Icon, label, active, badge, onPress }: { icon: LucideIcon; label: string; active: boolean; badge?: number; onPress: () => void }) {
  const { t } = useTheme();
  const reduced = useReducedMotion();
  const on = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) on.setValue(active ? 1 : 0);
    else Animated.spring(on, { toValue: active ? 1 : 0, speed: 18, bounciness: 6, useNativeDriver: NATIVE }).start();
  }, [active, on, reduced]);

  return (
    <Tappable
      onPress={onPress}
      haptic
      scaleTo={0.92}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className="flex-1 items-center justify-center gap-1 pt-1"
    >
      <View className="w-16 h-8 items-center justify-center">
        <Animated.View
          className={`absolute inset-0 rounded-full ${t.selected}`}
          style={{ opacity: on, transform: [{ scaleX: on.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}
        />
        <View>
          <Icon size={22} color={active ? t.hex.onSelected : t.hex.muted} strokeWidth={active ? 2.4 : 2} />
        </View>
        {badge ? (
          <View className="absolute top-0 right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-accent items-center justify-center">
            <Text className="text-white text-[9.5px] font-bold">{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[11px]" style={{ color: active ? t.hex.text : t.hex.muted, fontWeight: active ? '700' : '600' }}>
        {label}
      </Text>
    </Tappable>
  );
}

export default function BottomTabBar({ alerts }: { alerts: number }) {
  const { t } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabs = useMainTabs();
  return (
    <View
      className={`flex-row items-end ${t.card}`}
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        shadowColor: '#000',
        shadowOpacity: t.isDark ? 0.4 : 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
      }}
    >
      {tabs.map((item) => {
        const active = isActive(item, pathname);
        if (item.featured) {
          return <FeaturedTab key={item.href} icon={item.icon} label={item.label} active={active} onPress={() => goTo(item, pathname)} />;
        }
        return (
          <TabItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            active={active}
            badge={item.href === '/more' ? alerts : undefined}
            onPress={() => goTo(item, pathname)}
          />
        );
      })}
    </View>
  );
}
