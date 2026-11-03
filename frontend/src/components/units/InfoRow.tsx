import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  const { t } = useTheme();
  return (
    <View className={`flex-row justify-between py-2.5 border-b ${t.border}`}>
      <Text className={`text-[13px] ${t.muted}`}>{label}</Text>
      <Text className={`text-[13px] font-semibold ${t.text}`}>{value ?? '—'}</Text>
    </View>
  );
}
