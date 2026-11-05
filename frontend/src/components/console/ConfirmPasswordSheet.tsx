import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button, Field, Sheet } from '@/components/ui';

export interface ProtectedAction {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  run: (password: string) => Promise<void>;
}

export default function ConfirmPasswordSheet({ action, onClose }: { action: ProtectedAction | null; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPassword('');
  }, [action]);

  const confirm = async () => {
    if (!action || !password) return;
    setBusy(true);
    try {
      await action.run(password);
      onClose();
    } catch (err: any) {
      toast(err.message || 'Acción rechazada', 'error');
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!action} onClose={onClose} title={action?.title}>
      <View className="gap-3 pb-2">
        <Text className={`text-[13.5px] ${t.muted}`}>{action?.description}</Text>
        <Field icon={Lock} label="Tu contraseña" placeholder="Confirma con tu contraseña" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={confirm} />
        <Button label={action?.confirmLabel || 'Confirmar'} variant={action?.danger === false ? 'accent' : 'danger'} onPress={confirm} loading={busy} disabled={!password} />
      </View>
    </Sheet>
  );
}
