import { Pressable, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { MOBILE_TABS, goTo, isActive } from './navItems';
import FeaturedTab from './FeaturedTab';

export default function BottomTabBar({ alerts }: { alerts: number }) {
  const { t } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const activeColor = t.isDark ? '#f87203' : '#032347';
  return (
    <View className={`flex-row items-end border-t ${t.card} ${t.border}`} style={{ paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }}>
      {MOBILE_TABS.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        if (item.featured) {
          return <FeaturedTab key={item.href} icon={Icon} label={item.label} active={active} onPress={() => goTo(item, pathname)} />;
        }
        return (
          <Pressable
            key={item.href}
            onPress={() => goTo(item, pathname)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center justify-center gap-1 py-1 active:opacity-70"
          >
            <View>
              <Icon size={22} color={active ? activeColor : t.hex.muted} strokeWidth={active ? 2.4 : 2} />
              {item.href === '/more' && alerts > 0 ? (
                <View className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent items-center justify-center">
                  <Text className="text-white text-[9px] font-bold">{alerts > 99 ? '99+' : alerts}</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-[10.5px] font-semibold" style={{ color: active ? activeColor : t.hex.muted }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
