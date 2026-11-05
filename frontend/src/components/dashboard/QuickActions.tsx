import { Text, View } from 'react-native';
import Tappable from '@/components/shared/Tappable';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Bell, CircleDot, FileBarChart, Share2, Truck } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { usePlan } from '@/hooks/usePlan';

const ACTIONS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: 'Flota', icon: Truck, href: '/fleet' },
  { label: 'Alertas', icon: Bell, href: '/notifications' },
  { label: 'Reportes', icon: FileBarChart, href: '/reports' },
  { label: 'Geocercas', icon: CircleDot, href: '/geofences' },
];

const PERSONAL_ACTIONS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: 'Vehículos', icon: Truck, href: '/fleet' },
  { label: 'Alertas', icon: Bell, href: '/notifications' },
  { label: 'Reportes', icon: FileBarChart, href: '/reports' },
  { label: 'Compartir', icon: Share2, href: '/share' },
];

export default function QuickActions({ alerts }: { alerts: number }) {
  const { t } = useTheme();
  const { isClientPersonal } = usePlan();
  return (
    <View className="flex-row justify-between">
      {(isClientPersonal ? PERSONAL_ACTIONS : ACTIONS).map((a) => (
        <Tappable haptic scaleTo={0.92} key={a.label} onPress={() => router.push(a.href as never)} className="items-center gap-2 flex-1">
          <View className={`w-[60px] h-[60px] rounded-full items-center justify-center ${t.card}`}>
            <a.icon size={22} color={t.hex.brand} />
            {a.label === 'Alertas' && alerts > 0 ? (
              <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{alerts > 99 ? '99+' : alerts}</Text>
              </View>
            ) : null}
          </View>
          <Text className={`text-[12.5px] font-semibold ${t.text}`}>{a.label}</Text>
        </Tappable>
      ))}
    </View>
  );
}
