import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, Moon, Sun } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import AdminWordmark from './AdminWordmark';
import { MAKER_BRAND } from '@/lib/brand';
import { Button, ErrorBanner, Field, IconButton } from '@/components/ui';
import { consoleApi } from './consoleApi';

export default function ConsoleLogin() {
  const { t, toggle } = useTheme();
  const { staff, restoring, startStaffSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'floaGPS Admin';
  }, []);

  if (!restoring && staff) return <Redirect href="/console" />;

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await consoleApi.login(email.trim(), password);
      await startStaffSession(res.token, res.staff);
      router.replace('/console');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${t.screen}`}>
      <View className="absolute right-5 top-5 z-10">
        <IconButton icon={t.isDark ? Sun : Moon} label="Cambiar tema" onPress={toggle} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-[380px] self-center gap-3">
          <View className="self-center mb-8">
            <AdminWordmark size={24} />
          </View>
          {error ? <ErrorBanner message={error} /> : null}
          <Field outlined icon={Mail} placeholder="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field
            outlined
            icon={Lock}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            onSubmitEditing={submit}
            right={
              <Pressable onPress={() => setShowPassword((v) => !v)} accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} hitSlop={8}>
                {showPassword ? <EyeOff size={18} color={t.hex.muted} /> : <Eye size={18} color={t.hex.muted} />}
              </Pressable>
            }
          />
          <Button variant="accent" label="Entrar" onPress={submit} loading={loading} className="mt-2" />
          <Text className={`text-[12.5px] text-center mt-3 ${t.muted}`}>Acceso exclusivo para empleados de floaGPS.</Text>
        </View>
      </ScrollView>
      <Text className={`text-[12px] text-center pb-6 ${t.subtle}`}>{MAKER_BRAND}</Text>
    </View>
  );
}
