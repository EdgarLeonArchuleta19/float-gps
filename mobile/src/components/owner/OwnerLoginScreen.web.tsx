import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { KeyRound, Lock, Mail, Moon, ShieldCheck, Sun } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Wordmark from '@/components/brand/Wordmark';
import { Button, ErrorBanner, Field, IconButton } from '@/components/ui';
import { ownerApi } from '@/components/owner/ownerApi';

export default function OwnerLogin() {
  const { t, toggle } = useTheme();
  const { user, isOwner, restoring, startSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!restoring && user && isOwner) return <Redirect href="/owner-panel" />;

  const submit = async () => {
    if (!email.trim() || !password || !masterKey) {
      setError('Correo, contraseña y clave maestra son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await ownerApi.login(email.trim(), password, masterKey);
      await startSession(res.token, res.user);
      router.replace('/owner-panel');
    } catch (err: any) {
      setError(err.message || 'Credenciales de dueño inválidas');
    } finally {
      setMasterKey('');
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${t.screen}`}>
      <View className="absolute right-5 top-5 z-10">
        <IconButton icon={t.isDark ? Sun : Moon} label="Cambiar tema" onPress={toggle} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-[400px] self-center gap-3">
          <View className="self-center mb-5">
            <Wordmark size={26} />
          </View>
          <View className="flex-row items-center gap-2 self-start rounded-xl bg-navy px-3 py-1.5">
            <ShieldCheck size={14} color="#f87203" />
            <Text className="text-white text-[12px] font-semibold">Consola de Dueño</Text>
          </View>
          <Text className={`text-[24px] font-bold ${t.text}`}>Acceso restringido</Text>
          <Text className={`text-[13px] mb-2 ${t.muted}`}>Requiere correo, contraseña y la clave maestra del servidor. Cada intento queda registrado.</Text>
          {error ? <ErrorBanner message={error} /> : null}
          <Field icon={Mail} placeholder="Correo del dueño" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field icon={Lock} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
          <Field icon={KeyRound} placeholder="Clave maestra" value={masterKey} onChangeText={setMasterKey} secureTextEntry onSubmitEditing={submit} />
          <Button label="Entrar a la consola" onPress={submit} loading={loading} className="mt-2" />
        </View>
      </ScrollView>
    </View>
  );
}
