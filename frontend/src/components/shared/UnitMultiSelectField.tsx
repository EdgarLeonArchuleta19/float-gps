import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import type { FleetUnit } from '@/lib/types';
import UnitMultiSelect from './UnitMultiSelect';

function summary(units: FleetUnit[], selected: string[]) {
  const chosen = units.filter((u) => selected.includes(u.id));
  if (!chosen.length) return null;
  if (chosen.length <= 2) return chosen.map((u) => u.name).join(', ');
  return `${chosen[0].name}, ${chosen[1].name} y ${chosen.length - 2} más`;
}

export default function UnitMultiSelectField({
  label,
  units,
  selected,
  onChange,
  placeholder = 'Elige las unidades',
}: {
  label: string;
  units: FleetUnit[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const text = summary(units, selected);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <View className="gap-2">
      <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        className={`flex-row items-center gap-2 rounded-xl px-4 min-h-[54px] active:opacity-80 ${t.input}`}
        style={{ borderWidth: 1.5, borderColor: open ? t.hex.onSelected : 'transparent' }}
      >
        <Text className={`flex-1 text-[15px] ${text ? t.text : t.muted}`} numberOfLines={1}>
          {text || placeholder}
        </Text>
        {selected.length ? (
          <View className={`rounded-full px-2.5 py-0.5 ${t.selected}`}>
            <Text className="text-[12px] font-bold" style={{ color: t.hex.onSelected }}>
              {selected.length}
            </Text>
          </View>
        ) : null}
        <Chevron size={16} color={t.hex.muted} />
      </Pressable>
      {open ? (
        <View className={`rounded-xl p-2 ${t.input}`}>
          <UnitMultiSelect units={units} selected={selected} onChange={onChange} />
        </View>
      ) : null}
    </View>
  );
}
