import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, Search } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { markerColor } from '@/lib/format';
import type { FleetUnit } from '@/lib/types';
import { EmptyState, Field } from '@/components/ui';
import { usePagination } from '@/hooks/usePagination';
import Pagination from './Pagination';
import { UnitIcon } from './VehicleIcon';
import { ORANGE } from '@/lib/brand';

export default function UnitMultiSelect({
  units,
  selected,
  onChange,
  onSurface,
}: {
  units: FleetUnit[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onSurface?: boolean;
}) {
  const { t } = useTheme();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => !q || u.name.toLowerCase().includes(q) || u.plate.toLowerCase().includes(q));
  }, [units, search]);
  const { pageItems, pager } = usePagination(filtered, search, 10);
  const allSelected = filtered.length > 0 && filtered.every((u) => selected.includes(u.id));
  const accent = ORANGE;

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const toggleAll = () =>
    onChange(allSelected ? selected.filter((id) => !filtered.some((u) => u.id === id)) : [...new Set([...selected, ...filtered.map((u) => u.id)])]);

  return (
    <View className="gap-2">
      <Field search placeholder="Buscar unidad o placa" value={search} onChangeText={setSearch} />
      <View className="flex-row items-center justify-between px-1 py-1">
        <Text className={`text-[12px] ${t.muted}`}>{selected.length} seleccionadas</Text>
        <Pressable onPress={toggleAll} className="py-1">
          <Text className={`text-[12px] font-bold ${t.brandText}`}>
            {allSelected ? 'Quitar todas' : 'Seleccionar todas'}
          </Text>
        </Pressable>
      </View>
      {filtered.length ? (
        pageItems.map((u) => {
          const on = selected.includes(u.id);
          return (
            <Pressable
              key={u.id}
              onPress={() => toggle(u.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              className={`flex-row items-center gap-3 rounded-2xl px-3.5 py-3 ${on ? t.selected : onSurface ? t.tonal : t.card}`}
            >
              <View
                className="w-6 h-6 rounded-lg items-center justify-center border-2"
                style={{ borderColor: on ? accent : t.hex.border, backgroundColor: on ? accent : 'transparent' }}
              >
                {on ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
              </View>
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: `${markerColor(u.status)}1f` }}>
                <UnitIcon unit={u} size={28} />
              </View>
              <View className="flex-1">
                <Text className={`text-[15px] font-semibold ${t.text}`} numberOfLines={1}>
                  {u.name}
                </Text>
                <Text className={`text-[12.5px] mt-0.5 ${t.muted}`}>{u.plate}</Text>
              </View>
            </Pressable>
          );
        })
      ) : (
        <EmptyState icon={Search} title="Sin resultados" />
      )}
      <Pagination {...pager} />
    </View>
  );
}
