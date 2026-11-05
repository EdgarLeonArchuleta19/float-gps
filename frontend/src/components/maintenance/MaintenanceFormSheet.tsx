import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Save } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { toDateInput } from '@/lib/format';
import type { FleetUnit, Maintenance, MaintenanceKind } from '@/lib/types';
import SelectField from '@/components/shared/SelectField';
import UnitMultiSelectField from '@/components/shared/UnitMultiSelectField';
import LifecycleActions from '@/components/shared/LifecycleActions';
import { Button, Chip, ChipRow, ErrorBanner, Field, Sheet } from '@/components/ui';
import { MAINTENANCE_KINDS, maintenanceKind } from './maintenanceKinds';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function digits(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export default function MaintenanceFormSheet({
  visible,
  editing,
  units,
  unitId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: Maintenance | null;
  units: FleetUnit[];
  unitId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [kind, setKind] = useState<MaintenanceKind>('OIL');
  const [title, setTitle] = useState('');
  const [km, setKm] = useState('');
  const [days, setDays] = useState('');
  const [lastDone, setLastDone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const first = maintenanceKind(editing?.kind || 'OIL');
    const fixed = editing?.vehicleId || editing?.machineId || unitId;
    setUnitIds(fixed ? [fixed] : []);
    setKind(first.value);
    setTitle(editing?.title || first.label);
    setKm(editing ? (editing.intervalKm ? String(editing.intervalKm) : '') : first.km ? String(first.km) : '');
    setDays(editing ? (editing.intervalDays ? String(editing.intervalDays) : '') : first.days ? String(first.days) : '');
    setLastDone(toDateInput(editing ? new Date(editing.lastDoneAt) : new Date()));
    setNotes(editing?.notes || '');
    setError('');
  }, [visible, editing, unitId]);

  const pickKind = (value: MaintenanceKind) => {
    const next = maintenanceKind(value);
    if (!title.trim() || MAINTENANCE_KINDS.some((k) => k.label === title)) setTitle(next.label);
    setKind(value);
    setKm(next.km ? String(next.km) : '');
    setDays(next.days ? String(next.days) : '');
  };

  const chosen = units.filter((u) => unitIds.includes(u.id));
  const dateOk = DATE_PATTERN.test(lastDone);
  const canSave = chosen.length > 0 && title.trim().length >= 2 && (!!Number(km) || !!Number(days)) && dateOk;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const data = {
      kind,
      title: title.trim(),
      intervalKm: Number(km) || null,
      intervalDays: Number(days) || null,
      lastDoneAt: new Date(`${lastDone}T12:00:00`).toISOString(),
      notes: notes.trim(),
    };
    try {
      if (editing) {
        await api.maintenance.update(editing.id, data);
        toast('Mantenimiento actualizado', 'success');
      } else {
        const { created } = await api.maintenance.create({ ...data, units: chosen.map((u) => ({ kind: u.kind, id: u.id })) });
        toast(created === 1 ? 'Recordatorio creado' : `Recordatorio creado para ${created} unidades`, 'success');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Editar mantenimiento' : 'Nuevo recordatorio'}>
      <View className="gap-3 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        {editing ? (
          <SelectField label="Unidad" value={unitIds[0] || ''} options={units.map((u) => ({ value: u.id, label: u.name, hint: u.plate }))} onChange={() => {}} disabled />
        ) : (
          <UnitMultiSelectField label="Unidades" units={units} selected={unitIds} onChange={setUnitIds} />
        )}
        <View className="gap-1.5">
          <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Tipo</Text>
          <ChipRow>
            {MAINTENANCE_KINDS.map((k) => (
              <Chip key={k.value} label={k.label} icon={k.icon} active={kind === k.value} onPress={() => pickKind(k.value)} surface />
            ))}
          </ChipRow>
        </View>
        <Field label="Nombre" value={title} onChangeText={setTitle} maxLength={80} />
        <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Toca cada… (lo que llegue primero)</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Kilómetros" placeholder="Ej. 5000" value={km} onChangeText={(v) => setKm(digits(v))} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Field label="Días" placeholder="Ej. 180" value={days} onChangeText={(v) => setDays(digits(v))} keyboardType="number-pad" />
          </View>
        </View>
        <Field label="Último servicio" placeholder="AAAA-MM-DD" value={lastDone} onChangeText={(v) => setLastDone(v.trim())} />
        {!dateOk ? <Text className="text-[12px] text-red-500 ml-1">Escribe la fecha como AAAA-MM-DD.</Text> : null}
        <Text className={`text-[12px] ml-1 ${t.muted}`}>Los kilómetros se cuentan solos con el GPS desde esa fecha.</Text>
        <Field label="Notas" placeholder="Taller, tipo de aceite, póliza…" value={notes} onChangeText={setNotes} multiline maxLength={500} />
        <Button label={editing ? 'Guardar cambios' : 'Crear recordatorio'} icon={Save} onPress={save} loading={saving} disabled={!canSave} />
        {editing ? (
          <View className={`flex-row items-center justify-between gap-3 pt-3 mt-1 border-t ${t.border}`}>
            <Text className={`text-[12px] flex-1 ${t.muted}`}>{editing.isActive ? 'Recordatorio activo' : 'Recordatorio desactivado'}</Text>
            <LifecycleActions
              noun={{ label: 'mantenimiento' }}
              name={editing.title}
              active={editing.isActive}
              deactivateHint="Dejará de avisarte; su historial se conserva."
              onSetActive={(active) => api.maintenance.setActive(editing.id, active)}
              onDelete={() => api.maintenance.remove(editing.id)}
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
