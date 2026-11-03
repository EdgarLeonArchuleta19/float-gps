import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Sheet } from '@/components/ui';

interface Option {
  value: string;
  label: string;
}

export default function OptionPicker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona',
  compact,
}: {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View className="gap-1.5">
      {label ? <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between gap-2 rounded-xl border px-3.5 ${compact ? 'py-2' : 'py-3'} ${t.input} ${t.border}`}
      >
        <Text className={`flex-1 ${compact ? 'text-[12px]' : 'text-[14px]'} ${current ? t.text : t.muted}`} numberOfLines={1}>
          {current?.label || placeholder}
        </Text>
        <ChevronDown size={16} color={t.hex.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label || placeholder}>
        <View className="pb-2">
          {options.map((o) => (
            <Pressable
              key={o.value || 'empty'}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex-row items-center justify-between rounded-xl px-3 py-3 ${o.value === value ? t.active : ''} active:opacity-70`}
            >
              <Text className={`text-[14px] ${t.text}`}>{o.label}</Text>
              {o.value === value ? <Check size={16} color={t.hex.primary} /> : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
