import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button, Field, Sheet } from '@/components/ui';

export interface MasterAction {
  title: string;
  description: string;
  confirmLabel: string;
  run: (masterKey: string) => Promise<void>;
}

export default function MasterKeySheet({ action, onClose }: { action: MasterAction | null; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setKey('');
  }, [action]);

  const confirm = async () => {
    if (!action || !key.trim()) return;
    setBusy(true);
    try {
      await action.run(key);
      onClose();
    } catch (err: any) {
      toast(err.message || 'Acción rechazada', 'error');
    } finally {
      setKey('');
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!action} onClose={onClose} title={action?.title}>
      <View className="gap-3 pb-2">
        <Text className={`text-[13px] ${t.muted}`}>{action?.description}</Text>
        <Field
          icon={KeyRound}
          label="Clave maestra"
          placeholder="OWNER_MASTER_KEY"
          secureTextEntry
          value={key}
          onChangeText={setKey}
          onSubmitEditing={confirm}
        />
        <Button label={action?.confirmLabel || 'Confirmar'} variant="danger" onPress={confirm} loading={busy} disabled={!key.trim()} />
      </View>
    </Sheet>
  );
}
