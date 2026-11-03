import { Pressable, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function QuickAction({ icon: Icon, label, onPress, danger }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  const { t } = useTheme();
  const color = danger ? '#ef4444' : t.hex.primary;
  return (
    <Pressable onPress={onPress} className={`flex-1 items-center gap-1.5 rounded-2xl border py-3 ${t.card} ${t.border} active:opacity-70`}>
      <Icon size={20} color={color} />
      <Text className={`text-[11px] font-semibold ${t.text}`}>{label}</Text>
    </Pressable>
  );
}
