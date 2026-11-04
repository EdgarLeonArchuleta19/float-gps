import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react-native';
import Wordmark, { BrandMark } from '@/components/brand/Wordmark';
import { MAKER_CREDIT } from '@/lib/brand';
import { storage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { DESKTOP_GROUPS, goTo, isActive, type NavItem } from './navItems';

const OPEN_GROUPS_KEY = 'floa_sidebar_open';

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
  const canAdmin = useCanAdmin();
  const pathname = usePathname();
  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    storage.get(OPEN_GROUPS_KEY).then((saved) => {
      try {
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) setOpened(parsed);
      } catch {}
    });
  }, []);

  const toggleGroup = (key: string) => {
    setOpened((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      storage.set(OPEN_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const groups = DESKTOP_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || canAdmin) })).filter((g) => g.items.length);
  const pressedBg = t.isDark ? 'active:bg-white/5' : 'active:bg-black/5';

  return (
    <View className={`${t.card} border-r ${t.border} py-4`} style={{ width: collapsed ? 76 : 244 }}>
      <View className={`items-center mb-5 ${collapsed ? 'gap-3' : 'flex-row justify-between pl-5 pr-3'}`}>
        {!collapsed ? <Wordmark size={18} /> : <BrandMark size={30} />}
        <Pressable onPress={onToggle} accessibilityLabel={collapsed ? 'Expandir menú' : 'Colapsar menú'} className={`p-2 rounded-lg ${pressedBg}`}>
          {collapsed ? <ChevronsRight size={18} color={t.hex.muted} /> : <ChevronsLeft size={18} color={t.hex.muted} />}
        </Pressable>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {groups.map((g, gi) => {
          const hasActive = g.items.some((i) => isActive(i, pathname));
          const open = collapsed || !g.title || hasActive || opened.includes(g.key);
          return (
            <View key={g.key} className={gi ? 'mt-3' : ''}>
              {g.title ? (
                collapsed ? (
                  <View className={`h-px mx-2 mb-3 ${t.isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                ) : (
                  <Pressable
                    onPress={() => !hasActive && toggleGroup(g.key)}
                    accessibilityLabel={`${open ? 'Ocultar' : 'Mostrar'} ${g.title}`}
                    className={`flex-row items-center justify-between px-3 py-1.5 mb-1 rounded-lg ${pressedBg}`}
                  >
                    <Text className={`text-[10.5px] font-bold uppercase tracking-widest ${t.subtle}`}>{g.title}</Text>
                    {hasActive ? null : open ? <ChevronDown size={14} color={t.hex.muted} /> : <ChevronRight size={14} color={t.hex.muted} />}
                  </Pressable>
                )
              ) : null}
              {open ? (
                <View className="gap-0.5">
                  {g.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item, pathname)}
                      collapsed={collapsed}
                      badge={item.href === '/notifications' ? alerts : undefined}
                      onPress={() => goTo(item, pathname)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
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
