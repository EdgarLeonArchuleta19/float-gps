import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, KeyRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button, Field, Sheet } from '@/components/ui';
import { ownerApi, type OwnerUser } from './ownerApi';

export default function ResetPasswordSheet({ user, onClose }: { user: OwnerUser | null; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [custom, setCustom] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCustom('');
    setMasterKey('');
    setResult(null);
  }, [user]);

  const reset = async () => {
    if (!user || !masterKey.trim()) return;
    setBusy(true);
    try {
      const res = await ownerApi.resetUserPassword(user.id, masterKey, custom || undefined);
      setResult(res.temporaryPassword);
      toast('Contraseña actualizada y sesiones del usuario cerradas', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al resetear contraseña', 'error');
    } finally {
      setMasterKey('');
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    toast('Contraseña copiada', 'success');
  };

  return (
    <Sheet visible={!!user} onClose={onClose} title="Restablecer contraseña">
      {user ? (
        <View className="gap-3 pb-2">
          <Text className={`text-[13px] ${t.muted}`}>
            {user.name} · {user.email}. Se cerrarán todas sus sesiones abiertas.
          </Text>
          {result ? (
            <>
              <View className={`rounded-xl border p-4 ${t.input} ${t.border}`}>
                <Text className={`text-[11px] ${t.subtle}`}>Nueva contraseña</Text>
                <Text selectable className={`text-[18px] font-bold mt-1 ${t.text}`}>
                  {result}
                </Text>
              </View>
              <Button label="Copiar contraseña" icon={Copy} variant="secondary" onPress={copy} />
              <Button label="Listo" onPress={onClose} />
            </>
          ) : (
            <>
              <Field label="Nueva contraseña (opcional)" placeholder="Vacío = generar temporal" value={custom} onChangeText={setCustom} secureTextEntry />
              <Field icon={KeyRound} label="Clave maestra" value={masterKey} onChangeText={setMasterKey} secureTextEntry onSubmitEditing={reset} />
              <Button label="Restablecer" variant="danger" onPress={reset} loading={busy} disabled={!masterKey.trim()} />
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
