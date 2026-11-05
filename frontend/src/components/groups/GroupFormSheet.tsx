import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Check, Save } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import type { FleetUnit, UnitGroup } from '@/lib/types';
import Tappable from '@/components/shared/Tappable';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';
import LifecycleActions from '@/components/shared/LifecycleActions';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';

const COLORS = ['#032347', '#f87203', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ca8a04', '#0891b2', '#db2777', '#475569'];

export default function GroupFormSheet({
  visible,
  editing,
  units,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: UnitGroup | null;
  units: FleetUnit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(editing?.name || '');
    setColor(editing?.color || COLORS[0]);
    setSelected(editing ? [...editing.vehicleIds, ...editing.machineIds] : []);
    setError('');
  }, [visible, editing]);

  const elsewhere = units.filter((u) => selected.includes(u.id) && u.group && u.group.id !== editing?.id).length;

  const save = async () => {
    if (name.trim().length < 2) return;
    setSaving(true);
    setError('');
    const chosen = units.filter((u) => selected.includes(u.id));
    const data = {
      name: name.trim(),
      color,
      vehicleIds: chosen.filter((u) => u.kind === 'vehicle').map((u) => u.id),
      machineIds: chosen.filter((u) => u.kind === 'machine').map((u) => u.id),
    };
    try {
      if (editing) await api.groups.update(editing.id, data);
      else await api.groups.create(data);
      toast(editing ? 'Grupo actualizado' : 'Grupo creado', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Editar grupo' : 'Nuevo grupo'}>
      <View className="gap-3 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        <Field label="Nombre" placeholder="Ej. Repartidores" value={name} onChangeText={setName} maxLength={60} />
        <View className="gap-2">
          <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Color</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {COLORS.map((c) => (
              <Tappable key={c} onPress={() => setColor(c)} haptic accessibilityLabel={`Color ${c}`} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: c }}>
                {color === c ? <Check size={16} color="#ffffff" strokeWidth={3} /> : null}
              </Tappable>
            ))}
          </View>
        </View>
        <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Unidades del grupo</Text>
        <UnitMultiSelect units={units} selected={selected} onChange={setSelected} onSurface />
        {elsewhere ? (
          <Text className="text-[12px] text-amber-600 ml-1">
            {elsewhere} {elsewhere === 1 ? 'unidad ya está' : 'unidades ya están'} en otro grupo; al guardar se {elsewhere === 1 ? 'mueve' : 'mueven'} a este.
          </Text>
        ) : null}
        <Button label={editing ? 'Guardar cambios' : 'Crear grupo'} icon={Save} onPress={save} loading={saving} disabled={name.trim().length < 2} />
        {editing ? (
          <View className={`flex-row items-center justify-between gap-3 pt-3 mt-1 border-t ${t.border}`}>
            <Text className={`text-[12px] flex-1 ${t.muted}`}>{editing.isActive ? 'Grupo activo' : 'Grupo desactivado'}</Text>
            <LifecycleActions
              noun={{ label: 'grupo' }}
              name={editing.name}
              active={editing.isActive}
              deactivateHint="Dejará de aparecer en los filtros; sus unidades no cambian."
              onSetActive={(active) => api.groups.setActive(editing.id, active)}
              onDelete={() => api.groups.remove(editing.id)}
              onChanged={() => {
                onSaved();
                onClose();
              }}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
