import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, type CompanyUser, type Role } from '@/lib/api';
import { isStrongPassword } from '@/lib/passwordPolicy';
import { permissionSummary } from '@/lib/permissions';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';
import PasswordChecklist from '@/components/shared/PasswordChecklist';
import LifecycleActions from '@/components/shared/LifecycleActions';
import SelectField from '@/components/shared/SelectField';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserFormSheet({
  visible,
  editing,
  roles,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: CompanyUser | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);
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
    setPassword('');
    setConfirmPassword('');
    setRoleId(editing?.roleId || '');
    setError('');
  }, [visible, editing]);

  const canSave = editing
    ? name.trim().length >= 2 && !!roleId
    : name.trim().length >= 2 && EMAIL_PATTERN.test(email.trim()) && isStrongPassword(password) && password === confirmPassword && !!roleId;
  const mismatch = !!confirmPassword && password !== confirmPassword;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.users.update(editing.id, { name: name.trim(), roleId: isSelf ? undefined : roleId });
        toast('Usuario actualizado', 'success');
      } else {
        await api.users.create({ name: name.trim(), email: email.trim().toLowerCase(), password, roleId });
        toast('Usuario creado', 'success');
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
            <Field icon={KeyRound} label="Contraseña inicial" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <Field
              icon={KeyRound}
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            {mismatch ? <Text className="text-[12px] text-red-500">Las contraseñas no coinciden.</Text> : null}
            <PasswordChecklist password={password} />
          </>
        )}
        <View className="gap-1.5">
          {roles.length ? (
            <>
              <SelectField label="Rol" value={roleId} options={roleOptions} onChange={setRoleId} placeholder="Selecciona un rol" disabled={isSelf} />
              {isSelf ? <Text className={`text-[11.5px] ${t.subtle}`}>No puedes cambiar tu propio rol.</Text> : null}
              <Pressable onPress={createRole} className="self-start py-1">
                <Text className="text-[12px] font-semibold" style={{ color: t.isDark ? '#f87203' : '#032347' }}>
                  Crear un rol nuevo
                </Text>
              </Pressable>
            </>
          ) : (
            <View className="gap-2">
              <Text className={`text-[12.5px] ${t.muted}`}>Aún no hay roles. Crea uno para decidir qué puede ver este usuario.</Text>
              <Button label="Crear un rol" icon={ShieldCheck} variant="secondary" compact onPress={createRole} className="self-start" />
            </View>
          )}
        </View>
        <Button label={editing ? 'Guardar cambios' : 'Crear usuario'} onPress={save} loading={saving} disabled={!canSave} />
        {editing && !isSelf ? (
          <View className={`flex-row items-center justify-between gap-3 pt-3 mt-1 border-t ${t.border}`}>
            <Text className={`text-[12px] flex-1 ${t.muted}`}>{editing.isActive ? 'Acceso al sistema' : 'Usuario desactivado'}</Text>
            <LifecycleActions
              noun={{ label: 'usuario' }}
              name={editing.name}
              active={editing.isActive}
              deactivateHint="No podrá entrar al sistema y se cerrarán sus sesiones."
              onSetActive={(active) => api.users.setActive(editing.id, active)}
              onDelete={() => api.users.remove(editing.id)}
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
