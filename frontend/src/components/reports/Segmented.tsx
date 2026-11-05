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
  return (
    <View className={`flex-row rounded-full p-1 ${t.card}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center rounded-full py-2.5 ${active ? 'bg-navy' : 'active:opacity-60'}`}
          >
            <Text className={`text-[13px] font-bold ${active ? 'text-white' : t.muted}`} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
