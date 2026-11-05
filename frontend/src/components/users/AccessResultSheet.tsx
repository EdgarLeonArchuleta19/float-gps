import { Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, MailCheck } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { ORANGE } from '@/lib/brand';
import type { TemporaryAccess } from '@/lib/api';
import { Button, Sheet } from '@/components/ui';

export interface AccessResult extends TemporaryAccess {
  name: string;
  email: string;
  reset: boolean;
}

export default function AccessResultSheet({ result, onClose }: { result: AccessResult | null; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();

  const copy = async () => {
    if (!result?.temporaryPassword) return;
    await Clipboard.setStringAsync(result.temporaryPassword);
    toast('Contraseña copiada', 'success');
  };

  return (
    <Sheet visible={!!result} onClose={onClose} title={result?.reset ? 'Contraseña restablecida' : 'Usuario creado'}>
      {result ? (
        <View className="gap-3 pb-2">
          {result.emailSent ? (
            <View className="items-center gap-3 py-2">
              <View className={`w-16 h-16 rounded-full items-center justify-center ${t.tonal}`}>
                <MailCheck size={30} color={ORANGE} />
              </View>
              <Text className={`text-[14.5px] text-center ${t.text}`}>
                Enviamos una contraseña temporal a <Text className="font-bold">{result.email}</Text>.
              </Text>
              <Text className={`text-[13px] text-center ${t.muted}`}>Al entrar, {result.name} tendrá que crear su propia contraseña.</Text>
            </View>
          ) : (
            <>
              <Text className={`text-[13.5px] ${t.muted}`}>
                No pudimos enviar el correo a {result.email}. Comparte esta contraseña temporal con {result.name} por un medio seguro; al entrar tendrá que crear la suya.
              </Text>
              <View className={`rounded-xl p-4 ${t.input}`}>
                <Text className={`text-[12px] ${t.muted}`}>Contraseña temporal</Text>
                <Text selectable className={`text-[18px] font-bold mt-1 ${t.text}`}>
                  {result.temporaryPassword}
                </Text>
              </View>
              <Text className={`text-[12px] ${t.subtle}`}>No se volverá a mostrar.</Text>
              <Button label="Copiar contraseña" icon={Copy} variant="tonal" onPress={copy} />
            </>
          )}
          <Button label="Listo" onPress={onClose} />
        </View>
      ) : null}
    </Sheet>
  );
}
