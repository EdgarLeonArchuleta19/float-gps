import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { t } = useTheme();
  const activeBox = t.isDark ? 'bg-accent' : 'bg-navy';
  return (
    <View className={`flex-row rounded-xl border p-1 ${t.card} ${t.border}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center rounded-lg py-2 ${active ? activeBox : 'active:opacity-60'}`}
          >
            <Text className={`text-[12.5px] font-semibold ${active ? 'text-white' : t.muted}`} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
