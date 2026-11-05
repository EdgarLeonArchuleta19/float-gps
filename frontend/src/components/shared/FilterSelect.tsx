import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { FLOAT_SHADOW, Sheet } from '@/components/ui';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  tonal,
  floating,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  tonal?: boolean;
  floating?: boolean;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) || options[0];
  const accent = t.hex.onSelected;

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}: ${current?.label}`}
        className={`flex-row items-center gap-1.5 rounded-full pl-4 pr-3 h-10 ${tonal ? t.tonal : t.card} ${t.press}`}
        style={floating ? FLOAT_SHADOW : undefined}
      >
        <Text className={`text-[13px] ${t.muted}`}>{label}:</Text>
        <Text className={`text-[13px] font-bold ${t.text}`} numberOfLines={1}>
          {current?.label}
        </Text>
        {current?.count !== undefined ? <Text className={`text-[11px] ${t.subtle}`}>{current.count}</Text> : null}
        <ChevronDown size={16} color={t.hex.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View className="pb-2">
          {options.map((o) => {
            const selected = o.value === current?.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => choose(o.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 rounded-xl px-4 py-3.5 mb-1 ${selected ? t.selected : t.press}`}
              >
                <Text className={`flex-1 text-[15px] ${selected ? 'font-bold' : 'font-medium'} ${t.text}`}>{o.label}</Text>
                {o.count !== undefined ? <Text className={`text-[12px] ${t.muted}`}>{o.count}</Text> : null}
                <View className="w-5 items-end">{selected ? <Check size={17} color={accent} /> : null}</View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}
