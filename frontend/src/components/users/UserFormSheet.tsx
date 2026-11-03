import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { KeyRound, Mail, UserRound } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { isStrongPassword } from '@/lib/passwordPolicy';
import { Button, Chip, ChipRow, ErrorBanner, Field, Sheet } from '@/components/ui';
import PasswordChecklist from '@/components/shared/PasswordChecklist';

const ROLES = [
  { value: 'operator', label: 'Operador' },
  { value: 'viewer', label: 'Solo lectura' },
];

export default function UserFormSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName('');
    setEmail('');
    setPassword('');
    setRole('operator');
    setError('');
  }, [visible]);

  const canSave = !!name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && isStrongPassword(password);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await api.users.create({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      toast('Usuario creado', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nuevo usuario">
      <View className="gap-3 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        <Field icon={UserRound} label="Nombre" value={name} onChangeText={setName} />
        <Field icon={Mail} label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field icon={KeyRound} label="Contraseña inicial" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <PasswordChecklist password={password} />
        <ChipRow>
          {ROLES.map((r) => (
            <Chip key={r.value} label={r.label} active={role === r.value} onPress={() => setRole(r.value)} />
          ))}
        </ChipRow>
        <Button label="Crear usuario" onPress={save} loading={saving} disabled={!canSave} />
      </View>
    </Sheet>
  );
}
