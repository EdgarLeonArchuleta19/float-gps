import { Pressable, ScrollView, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react-native';
import Wordmark, { BrandMark } from '@/components/brand/Wordmark';
import { MAKER_CREDIT } from '@/lib/brand';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { goTo, isActive, useMainTabs, type NavItem } from './navItems';

function NavLink({ item, active, collapsed, badge, onPress }: { item: NavItem; active: boolean; collapsed: boolean; badge?: number; onPress: () => void }) {
  const { t } = useTheme();
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={item.label}
      className={`flex-row items-center gap-3 rounded-xl py-2.5 ${collapsed ? 'justify-center' : 'px-3'} ${active ? t.input : t.isDark ? 'active:bg-white/5' : 'active:bg-black/5'}`}
    >
      {active ? <View className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: t.hex.primary }} /> : null}
      <Icon size={19} color={active ? t.hex.primary : t.hex.muted} />
      {!collapsed ? (
        <Text className="flex-1 text-[13px] font-semibold" style={{ color: active ? t.hex.primary : t.hex.muted }} numberOfLines={1}>
          {item.label}
        </Text>
      ) : null}
      {badge ? (
        <View className={`rounded-full bg-accent items-center justify-center ${collapsed ? 'absolute top-1 right-3 w-2 h-2' : 'min-w-[20px] h-5 px-1.5'}`}>
          {!collapsed ? <Text className="text-white text-[10.5px] font-bold">{badge > 99 ? '99+' : badge}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Sidebar({ collapsed, onToggle, alerts }: { collapsed: boolean; onToggle: () => void; alerts: number }) {
  const { t } = useTheme();
  const { logout } = useAuth();
  const pathname = usePathname();
  const tabs = useMainTabs();
  const pressedBg = t.isDark ? 'active:bg-white/5' : 'active:bg-black/5';

  return (
    <View className={`${t.card} border-r ${t.border} py-4`} style={{ width: collapsed ? 76 : 244 }}>
      <View className={`items-center mb-5 ${collapsed ? 'gap-3' : 'flex-row justify-between pl-5 pr-3'}`}>
        {!collapsed ? <Wordmark size={18} /> : <BrandMark size={30} />}
        <Pressable onPress={onToggle} accessibilityLabel={collapsed ? 'Expandir menú' : 'Colapsar menú'} className={`p-2 rounded-lg ${pressedBg}`}>
          {collapsed ? <ChevronsRight size={18} color={t.hex.muted} /> : <ChevronsLeft size={18} color={t.hex.muted} />}
        </Pressable>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 2 }} showsVerticalScrollIndicator={false}>
        {tabs.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item, pathname)}
            collapsed={collapsed}
            badge={item.href === '/more' ? alerts : undefined}
            onPress={() => goTo(item, pathname)}
          />
        ))}
      </ScrollView>
      <View className={`border-t ${t.border} mx-3 pt-3`}>
        <Pressable onPress={logout} className={`flex-row items-center gap-3 rounded-xl py-2.5 ${collapsed ? 'justify-center' : 'px-3'} ${pressedBg}`}>
          <LogOut size={19} color={t.hex.muted} />
          {!collapsed ? <Text className="text-[13px] font-semibold" style={{ color: t.hex.muted }}>Cerrar sesión</Text> : null}
        </Pressable>
        {!collapsed ? <Text className={`text-[10.5px] px-3 mt-2 ${t.subtle}`}>{MAKER_CREDIT}</Text> : null}
      </View>
    </View>
  );
}
