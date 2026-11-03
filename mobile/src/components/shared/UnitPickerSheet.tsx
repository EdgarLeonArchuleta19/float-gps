import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Search } from 'lucide-react-native';
import type { FleetUnit } from '@/lib/types';
import UnitRow from '@/components/shared/UnitRow';
import { EmptyState, Field, Sheet } from '@/components/ui';

export default function UnitPickerSheet({
  visible,
  units,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  units: FleetUnit[];
  selectedId: string | null;
  onSelect: (unit: FleetUnit) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => !q || u.name.toLowerCase().includes(q) || u.plate.toLowerCase().includes(q));
  }, [units, search]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Selecciona una unidad">
      <View className="mb-2">
        <Field search placeholder="Buscar unidad o placa" value={search} onChangeText={setSearch} />
      </View>
      <View className="-mx-3 pb-2">
        {filtered.length ? (
          filtered.map((u) => (
            <UnitRow
              key={u.id}
              unit={u}
              selected={u.id === selectedId}
              onPress={() => {
                onSelect(u);
                onClose();
              }}
            />
          ))
        ) : (
          <EmptyState icon={Search} title="Sin resultados" />
        )}
      </View>
    </Sheet>
  );
}
