import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Bell, CircleDot, FileBarChart, Truck } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const ACTIONS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: 'Flota', icon: Truck, href: '/fleet' },
  { label: 'Alertas', icon: Bell, href: '/notifications' },
  { label: 'Reportes', icon: FileBarChart, href: '/reports' },
  { label: 'Geocercas', icon: CircleDot, href: '/geofences' },
];

export default function QuickActions({ alerts }: { alerts: number }) {
  const { t } = useTheme();
  return (
    <View className="flex-row justify-between">
      {ACTIONS.map((a) => (
        <Pressable key={a.label} onPress={() => router.push(a.href as never)} className="items-center gap-1.5 flex-1 active:opacity-70">
          <View className={`w-14 h-14 rounded-2xl items-center justify-center ${t.input}`}>
            <a.icon size={22} color={t.hex.primary} />
            {a.label === 'Alertas' && alerts > 0 ? (
              <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{alerts > 99 ? '99+' : alerts}</Text>
              </View>
            ) : null}
          </View>
          <Text className={`text-[12px] font-semibold ${t.text}`}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
