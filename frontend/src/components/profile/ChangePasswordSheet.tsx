import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { KeyRound, Lock } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { forgetEngineCredential } from '@/lib/engineCredential';
import { isStrongPassword } from '@/lib/passwordPolicy';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';
import PasswordChecklist from '@/components/shared/PasswordChecklist';

export default function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const { replaceToken } = useAuth();
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

  const strong = isStrongPassword(next);
  const matches = next.length > 0 && next === confirm;
  const different = next !== current;
  const canSave = !!current && strong && matches && different;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const { token } = await api.auth.changePassword(current, next);
      replaceToken(token);
      await forgetEngineCredential();
      toast('Contraseña actualizada. Se cerraron tus otras sesiones.', 'success');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hint = !confirm ? '' : !matches ? 'Las contraseñas no coinciden' : !different ? 'Debe ser distinta a la actual' : '';

  return (
    <Sheet visible={visible} onClose={onClose} title="Cambiar contraseña">
      <View className="gap-3 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        <Field icon={Lock} label="Contraseña actual" secureTextEntry value={current} onChangeText={setCurrent} autoComplete="password" />
        <Field icon={KeyRound} label="Nueva contraseña" secureTextEntry value={next} onChangeText={setNext} autoComplete="new-password" />
        <PasswordChecklist password={next} />
        <Field
          icon={KeyRound}
          label="Confirmar nueva contraseña"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          autoComplete="new-password"
          onSubmitEditing={save}
        />
        {hint ? <ErrorBanner message={hint} /> : null}
        <Button label="Actualizar contraseña" onPress={save} loading={saving} disabled={!canSave} />
      </View>
    </Sheet>
  );
}
