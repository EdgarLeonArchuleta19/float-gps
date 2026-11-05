import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function KmBar({ km, maxKm }: { km: number; maxKm: number }) {
  const { t } = useTheme();
  const pct = maxKm > 0 ? Math.max(4, Math.round((km / maxKm) * 100)) : 0;
  return (
    <View className={`h-2 rounded-full overflow-hidden ${t.tonal}`}>
      <View className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: t.hex.primary }} />
    </View>
  );
}
