import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { Fingerprint, Lock, Power, PowerOff, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { FleetUnit } from '@/lib/types';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';

type Action = 'stop' | 'resume';
type Step = 'choose' | 'confirm';

function vibrate(kind: Haptics.NotificationFeedbackType) {
  if (Platform.OS !== 'web') Haptics.notificationAsync(kind).catch(() => {});
}

export default function EngineCommandSheet({
  units,
  visible,
  onClose,
  onSent,
}: {
  units: FleetUnit[];
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [action, setAction] = useState<Action>('stop');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep('choose');
    setPassword('');
    setError('');
    if (Platform.OS === 'web') return;
    (async () => {
      const [hardware, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      if (!hardware || !enrolled) {
        setBiometricLabel(null);
        return;
      }
      const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometricLabel(face ? 'Confirmar con Face ID' : 'Confirmar con huella');
    })().catch(() => setBiometricLabel(null));
  }, [visible]);

  const targets = units;
  if (!targets.length) return null;
  const targetLabel = targets.length === 1 ? targets[0].name : `${targets.length} unidades`;

  const isStop = action === 'stop';
  const isViewer = user?.role === 'viewer';

  const send = async (withPassword?: string) => {
    setSending(true);
    setError('');
    try {
      const results = await Promise.allSettled(
        targets.map((target) => api.commands.engine({ unitId: target.id, unitType: target.kind, action, password: withPassword }))
      );
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length === targets.length) throw failed[0].reason;
      vibrate(Haptics.NotificationFeedbackType.Success);
      if (targets.length === 1) toast((results[0] as PromiseFulfilledResult<{ message: string }>).value.message, 'success');
      else toast(`Comando enviado a ${targets.length - failed.length} de ${targets.length} unidades`, failed.length ? 'info' : 'success');
      onSent?.();
      onClose();
    } catch (err: any) {
      vibrate(Haptics.NotificationFeedbackType.Error);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const confirmWithBiometrics = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: isStop ? `Paro de motor · ${targetLabel}` : `Reanudar motor · ${targetLabel}`,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    if (result.success) await send();
    else setError('No se pudo verificar tu identidad');
  };

  const confirmWithPassword = async () => {
    if (!password) {
      setError('Ingresa tu contraseña para confirmar');
      return;
    }
    await send(password);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={step === 'choose' ? 'Control de motor' : 'Confirma tu identidad'}>
      {isViewer ? (
        <ErrorBanner message="Tu cuenta es de solo lectura y no puede enviar comandos de motor." />
      ) : step === 'choose' ? (
        <View className="gap-3 pb-2">
          <Text className={`text-[13px] ${t.muted}`}>
            {targets.length === 1 ? 'Unidad ' : 'Destino: '}
            <Text className={`font-semibold ${t.text}`}>{targetLabel}</Text>
            {targets.length === 1 ? ` · ${targets[0].plate}` : ''}
          </Text>
          {(['stop', 'resume'] as Action[]).map((a) => {
            const selected = action === a;
            const Icon = a === 'stop' ? PowerOff : Power;
            const color = a === 'stop' ? '#ef4444' : '#22c55e';
            return (
              <Pressable
                key={a}
                onPress={() => setAction(a)}
                className={`flex-row items-center gap-3 rounded-2xl border p-4 ${t.card} ${selected ? '' : t.border}`}
                style={selected ? { borderColor: color, borderWidth: 2 } : undefined}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}1f` }}>
                  <Icon size={20} color={color} />
                </View>
                <View className="flex-1">
                  <Text className={`text-[14px] font-semibold ${t.text}`}>{a === 'stop' ? 'Paro de motor' : 'Reanudar motor'}</Text>
                  <Text className={`text-[12px] ${t.muted}`}>
                    {a === 'stop' ? 'Corta la ignición de forma remota' : 'Restablece la ignición de la unidad'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {isStop ? (
            <View className="flex-row gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <ShieldAlert size={18} color="#f59e0b" />
              <Text className="text-[12px] text-amber-600 flex-1">
                Úsalo solo con la unidad detenida o en caso de robo. Detener el motor en movimiento puede causar un accidente.
              </Text>
            </View>
          ) : null}
          <Button
            label="Continuar"
            variant={isStop ? 'danger' : 'primary'}
            onPress={() => setStep('confirm')}
            className="mt-1"
          />
        </View>
      ) : (
        <View className="gap-3 pb-2">
          <Text className={`text-[13px] ${t.muted}`}>
            Vas a enviar <Text className={`font-semibold ${t.text}`}>{isStop ? 'PARO DE MOTOR' : 'REANUDACIÓN'}</Text> a{' '}
            <Text className={`font-semibold ${t.text}`}>{targetLabel}</Text>. Esta acción queda registrada.
          </Text>
          {error ? <ErrorBanner message={error} /> : null}
          {biometricLabel ? (
            <>
              <Button
                label={biometricLabel}
                icon={Fingerprint}
                variant={isStop ? 'danger' : 'primary'}
                onPress={confirmWithBiometrics}
                loading={sending}
              />
              <Text className={`text-[11px] text-center ${t.subtle}`}>o usa tu contraseña</Text>
            </>
          ) : null}
          <Field
            icon={Lock}
            placeholder="Contraseña de tu cuenta"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            onSubmitEditing={confirmWithPassword}
          />
          <Button
            label={isStop ? 'Confirmar paro de motor' : 'Confirmar reanudación'}
            variant={biometricLabel ? 'secondary' : isStop ? 'danger' : 'primary'}
            onPress={confirmWithPassword}
            loading={sending && !!password}
            disabled={sending}
          />
          <Button label="Atrás" variant="ghost" onPress={() => setStep('choose')} disabled={sending} />
        </View>
      )}
    </Sheet>
  );
}
