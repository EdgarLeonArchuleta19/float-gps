import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { KeyRound, Lock } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { isStrongPassword } from '@/lib/passwordPolicy';
import { staffRoleLabel } from '@/lib/staff';
import PasswordChecklist from '@/components/shared/PasswordChecklist';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';
import { consoleApi } from './consoleApi';

const STAFF_MIN_LENGTH = 12;

export default function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const { staff, replaceToken } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  }, [visible]);

  const canSave = !!current && isStrongPassword(next, STAFF_MIN_LENGTH) && next === confirm && next !== current;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const { token } = await consoleApi.changePassword(current, next);
      replaceToken(token);
      toast('Contraseña actualizada. Se cerraron tus otras sesiones.', 'success');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Mi cuenta">
      <View className="gap-3 pb-2">
        <View className={`rounded-xl p-3.5 ${t.input}`}>
          <Text className={`text-[15px] font-bold ${t.text}`}>{staff?.name}</Text>
          <Text className={`text-[12.5px] ${t.muted}`}>
            {staff?.email} · {staffRoleLabel(staff?.role)}
          </Text>
        </View>
        <Text className={`text-[16px] font-bold mt-1 ${t.text}`}>Cambiar contraseña</Text>
        {error ? <ErrorBanner message={error} /> : null}
        <Field icon={Lock} label="Contraseña actual" secureTextEntry value={current} onChangeText={setCurrent} />
        <Field icon={KeyRound} label="Nueva contraseña" secureTextEntry value={next} onChangeText={setNext} />
        <PasswordChecklist password={next} minLength={STAFF_MIN_LENGTH} />
        <Field icon={KeyRound} label="Confirmar nueva contraseña" secureTextEntry value={confirm} onChangeText={setConfirm} onSubmitEditing={save} />
        {confirm && next !== confirm ? <Text className="text-[12.5px] text-red-500 ml-1">Las contraseñas no coinciden</Text> : null}
        <Button variant="accent" label="Guardar contraseña" onPress={save} loading={saving} disabled={!canSave} />
      </View>
    </Sheet>
  );
}
