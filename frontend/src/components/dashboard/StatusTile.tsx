import { Text, View } from 'react-native';
import Tappable from '@/components/shared/Tappable';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { markerColor } from '@/lib/format';

export default function StatusTile({ status, label, value }: { status: string; label: string; value: number }) {
  const { t } = useTheme();
  const color = markerColor(status);
  return (
    <Tappable haptic scaleTo={0.97}
      onPress={() => router.replace(`/live-map?status=${status}` as never)}
      className={`flex-1 min-w-[140px] rounded-2xl p-3.5 ${t.tonal}`}
    >
      <View className="flex-row items-center gap-1.5 mb-1">
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className={`text-[12.5px] font-medium ${t.muted}`} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className={`text-[26px] font-extrabold tracking-tight ${t.text}`}>{value}</Text>
    </Tappable>
  );
}
