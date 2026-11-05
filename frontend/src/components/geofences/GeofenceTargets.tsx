import { useState } from 'react';
import { Text, View } from 'react-native';
import { ListChecks, Truck } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFleet } from '@/hooks/useFleet';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import type { GeofenceAlertOn } from '@/lib/types';
import { Button, Chip, ChipRow, Loading, Sheet } from '@/components/ui';
import ScopeOption from '@/components/shared/ScopeOption';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';

const ALERT_OPTIONS: { value: GeofenceAlertOn; label: string }[] = [
  { value: 'ENTER', label: 'Al entrar' },
  { value: 'EXIT', label: 'Al salir' },
  { value: 'BOTH', label: 'Al entrar y salir' },
];

export interface GeofenceWatch {
  alertOn: GeofenceAlertOn;
  allUnits: boolean;
  unitIds: string[];
  groupIds: string[];
}

export default function GeofenceTargets({ value, onChange }: { value: GeofenceWatch; onChange: (next: GeofenceWatch) => void }) {
  const { t } = useTheme();
  const { units, loading } = useFleet();
  const { data: groups } = useApi(() => api.groups.list(), []);
  const [picking, setPicking] = useState(false);
  const set = (patch: Partial<GeofenceWatch>) => onChange({ ...value, ...patch });
  const activeGroups = (groups || []).filter((g) => g.isActive);
  const toggleGroup = (id: string) => set({ groupIds: value.groupIds.includes(id) ? value.groupIds.filter((g) => g !== id) : [...value.groupIds, id] });

  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Avisarme</Text>
        <ChipRow>
          {ALERT_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} active={value.alertOn === o.value} onPress={() => set({ alertOn: o.value })} surface />
          ))}
        </ChipRow>
      </View>
      <View className="gap-1.5">
        <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Unidades que vigila</Text>
        <View className="gap-2">
          <ScopeOption icon={Truck} title="Todas las unidades" hint="Incluye las que se agreguen después" active={value.allUnits} onPress={() => set({ allUnits: true })} />
          <ScopeOption icon={ListChecks} title="Solo algunas" hint="Elige grupos o unidades" active={!value.allUnits} onPress={() => set({ allUnits: false })} />
        </View>
      </View>
      {value.allUnits ? null : (
        <View className="gap-2.5">
          {activeGroups.length ? (
            <>
              <Text className={`text-[12.5px] ml-1 ${t.muted}`}>Grupos</Text>
              <ChipRow>
                {activeGroups.map((g) => (
                  <Chip key={g.id} label={`${g.name} · ${g.unitCount}`} active={value.groupIds.includes(g.id)} onPress={() => toggleGroup(g.id)} surface />
                ))}
              </ChipRow>
            </>
          ) : null}
          <Button
            label={value.unitIds.length ? `${value.unitIds.length} unidades elegidas` : 'Elegir unidades'}
            icon={ListChecks}
            variant="secondary"
            onPress={() => setPicking(true)}
          />
          {!value.groupIds.length && !value.unitIds.length ? <Text className="text-[12px] text-amber-600 ml-1">Elige al menos un grupo o una unidad.</Text> : null}
        </View>
      )}
      <Sheet visible={picking} onClose={() => setPicking(false)} title="Unidades que vigila">
        <View className="gap-3 pb-2">
          {loading && !units.length ? <Loading /> : <UnitMultiSelect units={units} selected={value.unitIds} onChange={(ids) => set({ unitIds: ids })} />}
          <Button label="Listo" onPress={() => setPicking(false)} />
        </View>
      </Sheet>
    </View>
  );
}
