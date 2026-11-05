import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { METRICS, type MetricKey } from './metrics';

export default function MetricTile({ metric, value, large }: { metric: MetricKey; value: string; large?: boolean }) {
  const { t } = useTheme();
  const { label, icon: Icon } = METRICS[metric];
  return (
    <View className={`flex-1 min-w-[44%] rounded-2xl ${large ? 'p-4' : 'p-3.5'} ${t.card}`}>
      <View className="flex-row items-center gap-2">
        <View className={`w-7 h-7 rounded-full items-center justify-center ${t.tonal}`}>
          <Icon size={14} color={t.hex.brand} />
        </View>
        <Text className={`text-[12.5px] font-medium flex-1 ${t.muted}`} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className={`${large ? 'text-[24px]' : 'text-[20px]'} font-extrabold tracking-tight mt-2 ${t.text}`}>{value}</Text>
    </View>
  );
}
