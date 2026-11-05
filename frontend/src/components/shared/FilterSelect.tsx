import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Sheet } from '@/components/ui';

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
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) || options[0];
  const accent = t.isDark ? '#f87203' : '#032347';

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
        className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${t.card} ${t.border} active:opacity-70`}
      >
        <Text className={`text-[12px] ${t.muted}`}>{label}:</Text>
        <Text className={`text-[12px] font-semibold ${t.text}`} numberOfLines={1}>
          {current?.label}
        </Text>
        {current?.count !== undefined ? <Text className={`text-[11px] ${t.subtle}`}>{current.count}</Text> : null}
        <ChevronDown size={14} color={t.hex.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View className="pb-2">
          {options.map((o, i) => {
            const selected = o.value === current?.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => choose(o.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 px-1 py-3 ${i < options.length - 1 ? `border-b ${t.border}` : ''} active:opacity-70`}
              >
                <Text className={`flex-1 text-[14px] ${selected ? 'font-semibold' : ''} ${t.text}`}>{o.label}</Text>
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
