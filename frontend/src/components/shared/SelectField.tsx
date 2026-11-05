import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export default function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
  disabled,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const Chevron = open ? ChevronUp : ChevronDown;

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View className="gap-1.5">
      {label ? <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled }}
        className={`flex-row items-center gap-2 rounded-xl border px-3.5 py-3 ${t.input} ${t.border} ${disabled ? 'opacity-60' : 'active:opacity-80'}`}
      >
        <Text className={`flex-1 text-[14px] ${current ? t.text : t.muted}`} numberOfLines={1}>
          {current?.label || placeholder}
        </Text>
        {disabled ? null : <Chevron size={16} color={t.hex.muted} />}
      </Pressable>
      {open ? (
        <View className={`rounded-xl border overflow-hidden ${t.card} ${t.border}`}>
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => choose(o.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 px-3.5 py-2.5 ${selected ? t.active : ''} ${i < options.length - 1 ? `border-b ${t.border}` : ''} active:opacity-70`}
              >
                <View className="flex-1">
                  <Text className={`text-[13.5px] font-semibold ${t.text}`}>{o.label}</Text>
                  {o.hint ? <Text className={`text-[11.5px] ${t.muted}`}>{o.hint}</Text> : null}
                </View>
                {selected ? <Check size={16} color={t.hex.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
