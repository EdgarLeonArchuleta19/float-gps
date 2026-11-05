import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Moon, Sun } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { userInitials } from '@/lib/user';
import { useCan } from '@/hooks/useCan';

function HeaderIcon({ icon: Icon, label, onPress, badge }: { icon: LucideIcon; label: string; onPress: () => void; badge?: number }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityRole="button" className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60">
      <Icon size={20} color={t.hex.muted} />
      {badge ? (
        <View className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent items-center justify-center">
          <Text className="text-white text-[9px] font-bold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HeaderActions({ alerts }: { alerts: number }) {
  const { t, toggle } = useTheme();
  const { user } = useAuth();
  const can = useCan();
  return (
    <View className="flex-row items-center gap-0.5">
      <HeaderIcon icon={t.isDark ? Sun : Moon} label="Cambiar tema" onPress={toggle} />
      {can('alerts') ? <HeaderIcon icon={Bell} label="Alertas" badge={alerts} onPress={() => router.replace('/notifications')} /> : null}
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityLabel="Mi perfil"
        className={`w-9 h-9 rounded-full items-center justify-center ml-1 ${t.isDark ? 'bg-accent' : 'bg-navy'}`}
      >
        <Text className="text-white text-[12px] font-bold">{userInitials(user)}</Text>
      </Pressable>
    </View>
  );
}
