import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { METRICS, type MetricKey } from './metrics';

export default function MetricTile({ metric, value, large }: { metric: MetricKey; value: string; large?: boolean }) {
  const { t } = useTheme();
  const { label, icon: Icon } = METRICS[metric];
  return (
    <View className={`flex-1 min-w-[44%] rounded-xl ${large ? 'p-3.5' : 'p-3'} border ${t.card} ${t.border}`}>
      <View className="flex-row items-center gap-1.5">
        <Icon size={large ? 15 : 14} color={t.hex.primary} />
        <Text className={`text-[11px] font-semibold ${t.muted}`}>
          {label}
        </Text>
      </View>
      <Text className={`${large ? 'text-[22px]' : 'text-[17px]'} font-bold mt-1 ${t.text}`}>{value}</Text>
    </View>
  );
}
