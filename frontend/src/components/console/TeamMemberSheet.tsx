import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Lock, Save, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { STAFF_ROLES, type StaffRole } from '@/lib/staff';
import Tappable from '@/components/shared/Tappable';
import { Button, Field, Sheet } from '@/components/ui';
import { TemporaryPassword } from './ResetPasswordSheet';
import { consoleApi, type TeamMember } from './consoleApi';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamMemberSheet({
  visible,
  member,
  selfId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  member: TeamMember | null;
  selfId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('support');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [temporary, setTemporary] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(member?.name || '');
    setEmail(member?.email || '');
    setRole(member?.role || 'support');
    setConfirmPassword('');
    setTemporary(null);
  }, [visible, member]);

  const editing = !!member;
  const self = member?.id === selfId;
  const canSave = name.trim().length >= 2 && (editing || EMAIL_PATTERN.test(email.trim())) && !!confirmPassword;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (member) {
        await consoleApi.updateMember(member.id, { name: name.trim(), ...(self ? {} : { role }) }, confirmPassword);
        toast('Integrante actualizado', 'success');
        onSaved();
        onClose();
      } else {
        const res = await consoleApi.createMember({ name: name.trim(), email: email.trim(), role }, confirmPassword);
        toast('Integrante agregado', 'success');
        onSaved();
        setTemporary(res.temporaryPassword);
      }
    } catch (err: any) {
      toast(err.message || 'No se pudo guardar', 'error');
      setConfirmPassword('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Editar integrante' : 'Nuevo integrante del equipo'}>
      <View className="gap-3 pb-2">
        {temporary ? (
          <>
            <Text className={`text-[13.5px] ${t.muted}`}>
              {name} ya puede entrar en la consola con su correo y esta contraseña. Pídele que la cambie en "Mi cuenta".
            </Text>
            <TemporaryPassword value={temporary} onDone={onClose} />
          </>
        ) : (
          <>
            <Field label="Nombre" value={name} onChangeText={setName} />
            {editing ? null : <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />}
            <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Rol</Text>
            {self ? <Text className={`text-[12.5px] ml-1 ${t.muted}`}>No puedes cambiar tu propio rol.</Text> : null}
            <View className="gap-2">
              {STAFF_ROLES.map((r) => {
                const active = r.value === role;
                return (
                  <Tappable
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    disabled={self}
                    accessibilityState={{ selected: active }}
                    className={`rounded-2xl px-4 py-3 ${active ? t.selected : t.input} ${self && !active ? 'opacity-50' : ''}`}
                    style={{ borderWidth: 1.5, borderColor: active ? t.hex.onSelected : 'transparent' }}
                  >
                    <Text className={`text-[14px] font-bold ${t.text}`}>{r.label}</Text>
                    <Text className={`text-[12.5px] mt-0.5 ${t.muted}`}>{r.hint}</Text>
                  </Tappable>
                );
              })}
            </View>
            <Field icon={Lock} label="Tu contraseña" placeholder="Confirma con tu contraseña" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            <Button variant="accent" label={editing ? 'Guardar cambios' : 'Agregar al equipo'} icon={editing ? Save : UserPlus} onPress={save} loading={saving} disabled={!canSave} className="mt-1" />
          </>
        )}
      </View>
    </Sheet>
  );
}
