import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Lock } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button, Field, Sheet } from '@/components/ui';
import { consoleApi, type CustomerUser } from './consoleApi';

export function TemporaryPassword({ value, onDone }: { value: string; onDone: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    toast('Contraseña copiada', 'success');
  };
  return (
    <>
      <View className={`rounded-xl p-4 ${t.input}`}>
        <Text className={`text-[12px] ${t.muted}`}>Contraseña temporal</Text>
        <Text selectable className={`text-[18px] font-bold mt-1 ${t.text}`}>
          {value}
        </Text>
      </View>
      <Text className={`text-[12.5px] ${t.muted}`}>Compártela por un canal seguro. No se volverá a mostrar.</Text>
      <Button label="Copiar contraseña" icon={Copy} variant="soft" onPress={copy} />
      <Button variant="accent" label="Listo" onPress={onDone} />
    </>
  );
}

export default function ResetPasswordSheet({ user, onClose }: { user: CustomerUser | null; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [custom, setCustom] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCustom('');
    setConfirmPassword('');
    setResult(null);
  }, [user]);

  const reset = async () => {
    if (!user || !confirmPassword) return;
    setBusy(true);
    try {
      const res = await consoleApi.resetUserPassword(user.id, confirmPassword, custom || undefined);
      setResult(res.temporaryPassword);
      toast('Contraseña actualizada y sesiones del usuario cerradas', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al restablecer la contraseña', 'error');
    } finally {
      setConfirmPassword('');
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!user} onClose={onClose} title="Restablecer contraseña">
      {user ? (
        <View className="gap-3 pb-2">
          <Text className={`text-[13.5px] ${t.muted}`}>
            {user.name} · {user.email}. Se cerrarán todas sus sesiones abiertas.
          </Text>
          {result ? (
            <TemporaryPassword value={result} onDone={onClose} />
          ) : (
            <>
              <Field label="Nueva contraseña (opcional)" placeholder="Vacío = generar una temporal" value={custom} onChangeText={setCustom} secureTextEntry />
              <Field icon={Lock} label="Tu contraseña" placeholder="Confirma con tu contraseña" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} onSubmitEditing={reset} />
              <Button label="Restablecer" variant="danger" onPress={reset} loading={busy} disabled={!confirmPassword} />
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
