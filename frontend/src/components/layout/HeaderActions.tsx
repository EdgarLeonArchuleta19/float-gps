import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Moon, Sun } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { userInitials } from '@/lib/user';
import { useCan } from '@/hooks/useCan';
import Tappable from '@/components/shared/Tappable';

function HeaderIcon({ icon: Icon, label, onPress, badge, onNavy }: { icon: LucideIcon; label: string; onPress: () => void; badge?: number; onNavy?: boolean }) {
  const { t } = useTheme();
  return (
    <Tappable
      onPress={onPress}
      haptic
      accessibilityLabel={label}
      accessibilityRole="button"
      className={`w-10 h-10 rounded-full items-center justify-center ${onNavy ? '' : t.tonal}`}
    >
      <Icon size={onNavy ? 21 : 19} color={onNavy ? '#ffffff' : t.hex.brand} strokeWidth={onNavy ? 1.8 : 2} />
      {badge ? (
        <View className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-accent items-center justify-center">
          <Text className="text-white text-[9.5px] font-bold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Tappable>
  );
}

export function ProfileAvatar({ size = 40, onNavy }: { size?: number; onNavy?: boolean }) {
  const { user } = useAuth();
  return (
    <View className={`rounded-full items-center justify-center ${onNavy ? 'bg-white/15' : 'bg-accent'}`} style={{ width: size, height: size }}>
      <Text className="text-white font-bold" style={{ fontSize: size * 0.32 }}>
        {userInitials(user)}
      </Text>
    </View>
  );
}

export default function HeaderActions({ alerts, avatar = true, onNavy }: { alerts: number; avatar?: boolean; onNavy?: boolean }) {
  const { t, toggle } = useTheme();
  const can = useCan();
  return (
    <View className={`flex-row items-center ${onNavy ? 'gap-0.5' : 'gap-2'}`}>
      <HeaderIcon icon={t.isDark ? Sun : Moon} label="Cambiar tema" onPress={toggle} onNavy={onNavy} />
      {can('alerts') ? <HeaderIcon icon={Bell} label="Alertas" badge={alerts} onPress={() => router.replace('/notifications')} onNavy={onNavy} /> : null}
      {avatar ? (
        <Tappable onPress={() => router.push('/profile')} haptic accessibilityLabel="Mi perfil" className="ml-1">
          <ProfileAvatar size={38} />
        </Tappable>
      ) : null}
    </View>
  );
}
