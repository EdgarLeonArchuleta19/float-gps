import { Pressable, ScrollView, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react-native';
import Wordmark, { BrandMark } from '@/components/brand/Wordmark';
import { MAKER_BRAND, ORANGE } from '@/lib/brand';
import { useAuth } from '@/context/AuthContext';
import { goTo, isActive, useMainTabs, type NavItem } from './navItems';

const IDLE = 'rgba(255,255,255,0.72)';

function NavLink({ item, active, collapsed, badge, onPress }: { item: NavItem; active: boolean; collapsed: boolean; badge?: number; onPress: () => void }) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={item.label}
      className={`flex-row items-center gap-3 rounded-xl py-2.5 ${collapsed ? 'justify-center' : 'px-3'} ${active ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'}`}
    >
      {active ? <View className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: ORANGE }} /> : null}
      <Icon size={19} color={active ? ORANGE : IDLE} />
      {!collapsed ? (
        <Text className={`flex-1 text-[13px] font-semibold ${active ? 'text-white' : 'text-white/75'}`} numberOfLines={1}>
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
  const { logout } = useAuth();
  const pathname = usePathname();
  const tabs = useMainTabs();

  return (
    <View className="bg-navy py-4" style={{ width: collapsed ? 76 : 244 }}>
      <View className={`items-center mb-5 ${collapsed ? 'gap-3' : 'flex-row justify-between pl-5 pr-3'}`}>
        {!collapsed ? <Wordmark size={18} onDark /> : <BrandMark size={30} onDark />}
        <Pressable onPress={onToggle} accessibilityLabel={collapsed ? 'Expandir menú' : 'Colapsar menú'} className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10">
          {collapsed ? <ChevronsRight size={18} color={IDLE} /> : <ChevronsLeft size={18} color={IDLE} />}
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
      <View className="border-t border-white/10 mx-3 pt-3">
        <Pressable onPress={logout} className={`flex-row items-center gap-3 rounded-xl py-2.5 ${collapsed ? 'justify-center' : 'px-3'} hover:bg-white/5 active:bg-white/10`}>
          <LogOut size={19} color={IDLE} />
          {!collapsed ? <Text className="text-[13px] font-semibold text-white/75">Cerrar sesión</Text> : null}
        </Pressable>
        {!collapsed ? <Text className="text-[10.5px] px-3 mt-2 text-white/40">{MAKER_BRAND}</Text> : null}
      </View>
    </View>
  );
}
