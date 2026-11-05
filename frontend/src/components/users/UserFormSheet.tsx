import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ListChecks, Mail, MailCheck, ShieldCheck, Truck, UserRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, type CompanyUser, type Role } from '@/lib/api';
import { permissionSummary } from '@/lib/permissions';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';
import SelectField from '@/components/shared/SelectField';
import ScopeOption from '@/components/shared/ScopeOption';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';
import { useFleet } from '@/hooks/useFleet';
import type { AccessResult } from './AccessResultSheet';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserFormSheet({
  visible,
  editing,
  roles,
  onClose,
  onSaved,
  onCreated,
}: {
  visible: boolean;
  editing: CompanyUser | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
  onCreated: (result: AccessResult) => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [ownUnits, setOwnUnits] = useState(false);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { units } = useFleet();
  const [error, setError] = useState('');

  const isSelf = !!editing && editing.id === user?.id;
  const roleOptions = roles.filter((r) => r.isActive || r.id === editing?.roleId).map((r) => ({
    value: r.id,
    label: r.name,
    hint: r.systemKey === 'admin' ? 'Todo, incluye usuarios, roles y configuración' : `${permissionSummary(r.permissions)}${r.allUnits ? '' : ' · unidades seleccionadas'}`,
  }));

  useEffect(() => {
    if (!visible) return;
    setName(editing?.name || '');
    setEmail(editing?.email || '');
    setRoleId(editing?.roleId || '');
    setOwnUnits(!!editing?.ownUnits);
    setUnitIds(editing ? [...editing.vehicleIds, ...editing.machineIds] : []);
    setError('');
  }, [visible, editing]);

  const selectedRole = roles.find((r) => r.id === roleId);
  const isAdminRole = selectedRole?.systemKey === 'admin';
  const personal = ownUnits && !isAdminRole;
  const unitsOk = !personal || unitIds.length > 0;
  const canSave = name.trim().length >= 2 && !!roleId && unitsOk && (!!editing || EMAIL_PATTERN.test(email.trim()));

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const chosen = units.filter((u) => unitIds.includes(u.id));
    const scope = {
      ownUnits: personal,
      vehicleIds: personal ? chosen.filter((u) => u.kind === 'vehicle').map((u) => u.id) : [],
      machineIds: personal ? chosen.filter((u) => u.kind === 'machine').map((u) => u.id) : [],
    };
    try {
      if (editing) {
        await api.users.update(editing.id, { name: name.trim(), roleId: isSelf ? undefined : roleId, ...(isSelf ? {} : scope) });
        toast('Usuario actualizado', 'success');
      } else {
        const res = await api.users.create({ name: name.trim(), email: email.trim().toLowerCase(), roleId, ...scope });
        onCreated({ emailSent: res.emailSent, temporaryPassword: res.temporaryPassword, name: res.user.name, email: res.user.email, reset: false });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createRole = () => {
    onClose();
    router.push('/roles/new' as never);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Editar usuario' : 'Nuevo usuario'}>
      <View className="gap-3 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        <Field icon={UserRound} label="Nombre" value={name} onChangeText={setName} />
        {editing ? (
          <Field icon={Mail} label="Correo" value={email} editable={false} />
        ) : (
          <>
            <Field icon={Mail} label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <View className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 ${t.tonal}`}>
              <MailCheck size={18} color={t.hex.brand} />
              <Text className={`flex-1 text-[12.5px] ${t.muted}`}>Le enviaremos una contraseña temporal a este correo. Al entrar por primera vez creará la suya.</Text>
            </View>
          </>
        )}
        <View className="gap-1.5">
          {roles.length ? (
            <>
              <SelectField label="Rol" value={roleId} options={roleOptions} onChange={setRoleId} placeholder="Selecciona un rol" disabled={isSelf} />
              {isSelf ? <Text className={`text-[11.5px] ${t.subtle}`}>No puedes cambiar tu propio rol.</Text> : null}
              <Pressable onPress={createRole} className="self-start py-1">
                <Text className={`text-[12px] font-bold ${t.brandText}`}>Crear un rol nuevo</Text>
              </Pressable>
            </>
          ) : (
            <View className="gap-2">
              <Text className={`text-[12.5px] ${t.muted}`}>Aún no hay roles. Crea uno para decidir qué puede ver este usuario.</Text>
              <Button label="Crear un rol" icon={ShieldCheck} variant="secondary" compact onPress={createRole} className="self-start" />
            </View>
          )}
        </View>
        {roleId && !isAdminRole && !isSelf ? (
          <View className="gap-2">
            <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Unidades que verá</Text>
            <ScopeOption
              icon={Truck}
              title="Las de su rol"
              hint={selectedRole?.allUnits ? 'Todas las unidades' : 'Las unidades elegidas en el rol'}
              active={!ownUnits}
              onPress={() => setOwnUnits(false)}
            />
            <ScopeOption icon={ListChecks} title="Solo las de esta persona" hint="Ej. el chofer solo ve su camión" active={ownUnits} onPress={() => setOwnUnits(true)} />
            {ownUnits ? <UnitMultiSelect units={units} selected={unitIds} onChange={setUnitIds} onSurface /> : null}
          </View>
        ) : null}
        <Button label={editing ? 'Guardar cambios' : 'Crear y enviar acceso'} onPress={save} loading={saving} disabled={!canSave} />
      </View>
    </Sheet>
  );
}
