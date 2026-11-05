import { Text, View } from 'react-native';
import Tappable from '@/components/shared/Tappable';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function QuickAction({ icon: Icon, label, onPress, danger }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  const { t } = useTheme();
  const color = danger ? '#ef4444' : t.hex.brand;
  return (
    <Tappable onPress={onPress} haptic scaleTo={0.92} className="flex-1 items-center gap-2 py-1">
      <View className={`w-14 h-14 rounded-full items-center justify-center ${danger ? 'bg-red-500/10' : t.card}`}>
        <Icon size={21} color={color} />
      </View>
      <Text className={`text-[12px] font-semibold text-center ${t.text}`} numberOfLines={1}>
        {label}
      </Text>
    </Tappable>
  );
}
