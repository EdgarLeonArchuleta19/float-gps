import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Check, ListChecks, Lock, Map, Save, Truck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useFleet } from '@/hooks/useFleet';
import { api, type Role } from '@/lib/api';
import { PERMISSION_OPTIONS, type Permission } from '@/lib/permissions';
import { Button, Card, ErrorBanner, Field, Loading, SectionTitle } from '@/components/ui';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';
import LifecycleActions from '@/components/shared/LifecycleActions';

function CheckBox({ on }: { on: boolean }) {
  const { t } = useTheme();
  const accent = t.isDark ? '#f87203' : '#032347';
  return (
    <View
      className="w-5 h-5 rounded-md items-center justify-center border-2"
      style={{ borderColor: on ? accent : t.hex.border, backgroundColor: on ? accent : 'transparent' }}
    >
      {on ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
    </View>
  );
}

function ScopeOption({
  icon: Icon,
  title,
  hint,
  active,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const accent = t.isDark ? '#f87203' : '#032347';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled }}
      className={`flex-1 flex-row items-center gap-3 rounded-2xl border p-3.5 ${t.card} ${active ? '' : t.border} active:opacity-80`}
      style={active ? { borderColor: accent, borderWidth: 2 } : undefined}
    >
      <Icon size={19} color={active ? accent : t.hex.muted} />
      <View className="flex-1">
        <Text className={`text-[13.5px] font-semibold ${t.text}`}>{title}</Text>
        <Text className={`text-[11.5px] ${t.muted}`}>{hint}</Text>
      </View>
    </Pressable>
  );
}

export default function RoleForm({ initial }: { initial?: Role }) {
  const { t } = useTheme();
  const toast = useToast();
  const { units, loading: loadingUnits } = useFleet();
  const [name, setName] = useState(initial?.name || '');
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions || ['dashboard', 'alerts', 'fleet']);
  const [allUnits, setAllUnits] = useState(initial?.allUnits ?? true);
  const [selected, setSelected] = useState<string[]>(initial ? [...initial.vehicleIds, ...initial.machineIds] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const readOnly = !!initial?.systemKey;

  const togglePermission = (key: Permission) =>
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  const allPermissions = PERMISSION_OPTIONS.every((p) => permissions.includes(p.key));

  const canSave = name.trim().length >= 2 && (allUnits || selected.length > 0);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const chosen = units.filter((u) => selected.includes(u.id));
    const payload = {
      name: name.trim(),
      permissions,
      allUnits,
      vehicleIds: allUnits ? [] : chosen.filter((u) => u.kind === 'vehicle').map((u) => u.id),
      machineIds: allUnits ? [] : chosen.filter((u) => u.kind === 'machine').map((u) => u.id),
    };
    try {
      if (initial) await api.roles.update(initial.id, payload);
      else await api.roles.create(payload);
      toast(initial ? 'Rol actualizado' : 'Rol creado', 'success');
      router.replace('/roles' as never);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {error ? <ErrorBanner message={error} /> : null}
      {readOnly ? (
        <Card className="p-3 mb-3 flex-row items-center gap-3">
          <Lock size={17} color={t.hex.muted} />
          <Text className={`text-[12.5px] flex-1 ${t.muted}`}>
            Rol predeterminado del sistema: se puede asignar a usuarios, pero no editar ni eliminar.
            {initial?.systemKey === 'admin' ? ' Además administra usuarios, roles y configuración de la empresa.' : ''}
          </Text>
        </Card>
      ) : null}
      <Card className="p-4">
        <Field label="Nombre del rol" placeholder="Ej. Supervisor de rutas" value={name} onChangeText={setName} maxLength={60} editable={!readOnly} />
      </Card>

      <SectionTitle
        right={
          readOnly ? undefined : (
          <Pressable
            onPress={() => setPermissions(allPermissions ? [] : PERMISSION_OPTIONS.map((p) => p.key))}
            className="py-1"
          >
            <Text className="text-[12px] font-semibold" style={{ color: t.isDark ? '#f87203' : '#032347' }}>
              {allPermissions ? 'Quitar todas' : 'Seleccionar todas'}
            </Text>
          </Pressable>
          )
        }
      >
        Opciones que verá
      </SectionTitle>
      <Card className="py-1">
        <View className={`flex-row items-center gap-3 px-4 py-3 border-b ${t.border}`}>
          <Map size={18} color={t.hex.muted} />
          <View className="flex-1">
            <Text className={`text-[13.5px] font-semibold ${t.text}`}>Mapa, perfil y ayuda</Text>
            <Text className={`text-[11.5px] ${t.muted}`}>Siempre disponibles para todos</Text>
          </View>
        </View>
        {PERMISSION_OPTIONS.map((p, i) => {
          const on = permissions.includes(p.key);
          return (
            <Pressable
              key={p.key}
              onPress={() => togglePermission(p.key)}
              disabled={readOnly}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: readOnly }}
              className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${i < PERMISSION_OPTIONS.length - 1 ? `border-b ${t.border}` : ''}`}
            >
              <p.icon size={18} color={on ? t.hex.primary : t.hex.muted} />
              <View className="flex-1">
                <Text className={`text-[13.5px] font-semibold ${t.text}`}>{p.label}</Text>
                <Text className={`text-[11.5px] ${t.muted}`}>{p.hint}</Text>
              </View>
              <CheckBox on={on} />
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle>Unidades que podrá ver</SectionTitle>
      <View className="flex-row gap-3 mb-3">
        <ScopeOption icon={Truck} title="Todas las unidades" hint="Incluye las que se agreguen después" active={allUnits} disabled={readOnly} onPress={() => setAllUnits(true)} />
        <ScopeOption icon={ListChecks} title="Solo algunas" hint="Elige cuáles" active={!allUnits} disabled={readOnly} onPress={() => setAllUnits(false)} />
      </View>
      {!allUnits ? (
        <Card className="p-3">
          {loadingUnits && !units.length ? <Loading /> : <UnitMultiSelect units={units} selected={selected} onChange={setSelected} />}
        </Card>
      ) : null}

      {readOnly ? null : (
        <Button label={initial ? 'Guardar cambios' : 'Crear rol'} icon={Save} onPress={save} loading={saving} disabled={!canSave} className="mt-4" />
      )}
      {initial && !readOnly ? (
        <Card className="p-4 mt-4 flex-row items-center justify-between gap-3">
          <Text className={`text-[12.5px] flex-1 ${t.muted}`}>
            {initial.isActive ? 'Un rol desactivado no se puede asignar a usuarios.' : 'Este rol está desactivado.'}
          </Text>
          <LifecycleActions
            noun={{ label: 'rol' }}
            name={initial.name}
            active={initial.isActive}
            deactivateHint="No se podrá asignar a usuarios nuevos."
            onSetActive={(active) => api.roles.setActive(initial.id, active)}
            onDelete={() => api.roles.remove(initial.id)}
            onChanged={() => router.replace('/roles' as never)}
          />
        </Card>
      ) : null}
    </View>
  );
}
