import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, CheckCircle2, Hash, KeyRound, Mail } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { isStrongPassword } from '@/lib/passwordPolicy';
import { ErrorBanner } from '@/components/ui';
import LoginField from './LoginField';
import LoginButton from './LoginButton';
import PasswordChecklist from '@/components/shared/PasswordChecklist';

type Step = 'email' | 'code' | 'done';

export default function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: (email?: string) => void }) {
  const { t } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const requestCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.forgotPassword(email.trim());
      setInfo(res.message);
      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canReset = code.trim().length === 6 && isStrongPassword(password) && password === confirm;

  const reset = async () => {
    if (!canReset) return;
    setLoading(true);
    setError('');
    try {
      await api.auth.resetPassword(email.trim(), code.trim(), password);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const header = (title: string, subtitle: string) => (
    <View className="mb-2">
      <Pressable onPress={() => onBack()} className="flex-row items-center gap-1.5 mb-3 self-start">
        <ArrowLeft size={16} color={t.hex.muted} />
        <Text className={`text-[13px] font-semibold ${t.muted}`}>Volver al inicio de sesión</Text>
      </Pressable>
      <Text className={`text-[26px] font-bold tracking-tight ${t.text}`}>{title}</Text>
      <Text className={`text-[13.5px] mt-1 ${t.muted}`}>{subtitle}</Text>
    </View>
  );

  if (step === 'done') {
    return (
      <View className="gap-4 items-center py-4">
        <CheckCircle2 size={44} color="#22c55e" />
        <Text className={`text-[20px] font-bold text-center ${t.text}`}>Contraseña actualizada</Text>
        <Text className={`text-[13.5px] text-center ${t.muted}`}>Ya puedes iniciar sesión con tu nueva contraseña.</Text>
        <View className="self-stretch">
          <LoginButton label="Iniciar sesión" onPress={() => onBack(email.trim())} />
        </View>
      </View>
    );
  }

  if (step === 'code') {
    return (
      <View className="gap-4">
        {header('Revisa tu correo', info || `Enviamos un código de 6 dígitos a ${email.trim()}.`)}
        {error ? <ErrorBanner message={error} /> : null}
        <LoginField
          icon={Hash}
          label="Código de 6 dígitos"
          placeholder="000000"
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        <LoginField icon={KeyRound} label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <PasswordChecklist password={password} />
        <LoginField
          icon={KeyRound}
          label="Confirmar contraseña"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          onSubmitEditing={reset}
        />
        {confirm && password !== confirm ? <ErrorBanner message="Las contraseñas no coinciden" /> : null}
        <LoginButton label="Cambiar contraseña" onPress={reset} loading={loading} disabled={!canReset} />
        <Pressable onPress={requestCode} disabled={loading} className="self-center py-2">
          <Text className={`text-[13px] font-semibold ${t.isDark ? 'text-accent' : 'text-navy'}`}>Reenviar código</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {header('Recuperar acceso', 'Te enviaremos un código para crear una nueva contraseña. Tu contraseña actual no cambia hasta que confirmes.')}
      {error ? <ErrorBanner message={error} /> : null}
      <LoginField
        icon={Mail}
        label="Correo"
        placeholder="correo@empresa.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        onSubmitEditing={requestCode}
      />
      <LoginButton label="Enviar código" onPress={requestCode} loading={loading} />
    </View>
  );
}
