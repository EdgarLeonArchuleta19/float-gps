import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { ORANGE } from '@/lib/brand';

export default function ScopeOption({
  icon: Icon,
  title,
  hint,
  active,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const accent = ORANGE;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled }}
      className={`flex-1 flex-row items-center gap-3 rounded-2xl p-4 ${active ? t.selected : t.card} active:opacity-80`}
    >
      <Icon size={19} color={active ? accent : t.hex.muted} />
      <View className="flex-1">
        <Text className={`text-[13.5px] font-semibold ${t.text}`}>{title}</Text>
        <Text className={`text-[11.5px] ${t.muted}`}>{hint}</Text>
      </View>
    </Pressable>
  );
}
