import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { OnNavyTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { homeRoute } from '@/lib/session';
import { MAKER_CREDIT } from '@/lib/brand';
import { ErrorBanner } from '@/components/ui';
import AnimatedBackdrop from '@/components/brand/AnimatedBackdrop';
import ForgotPassword from '@/components/login/ForgotPassword';
import LoginField from '@/components/login/LoginField';
import LoginButton from '@/components/login/LoginButton';

const logoOnNavy = require('../../../assets/images/logo-floa-black.png');

export default function Login() {
  const { user, restoring, login, isOwner, supportCompany } = useAuth();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ empresa?: string }>();
  const company = typeof params.empresa === 'string' && params.empresa.trim() ? params.empresa.trim() : null;

  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  if (!restoring && user) return <Redirect href={homeRoute(isOwner, !!supportCompany)} />;

  const submit = async () => {
    setAttempt((n) => n + 1);
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    const res = await login(email, password, company);
    setLoading(false);
    if (res.ok) router.replace('/dashboard');
    else setError(res.error || 'Credenciales incorrectas');
  };

  const form =
    view === 'forgot' ? (
      <ForgotPassword
        initialEmail={email}
        onBack={(confirmedEmail) => {
          if (confirmedEmail) {
            setEmail(confirmedEmail);
            setPassword('');
          }
          setView('login');
        }}
      />
    ) : (
      <View className="gap-5">
        <View>
          {company ? (
            <View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1 mb-4 bg-white/10">
              <Building2 size={12} color="#f87203" />
              <Text className="text-[12px] font-semibold text-white">{company}</Text>
            </View>
          ) : null}
          <Text className="text-[28px] font-bold tracking-tight text-white">Inicia sesión</Text>
        </View>
        {error ? <ErrorBanner key={attempt} message={error} /> : null}
        <LoginField
          label="Correo"
          icon={Mail}
          placeholder="tu@empresa.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
        />
        <View className="gap-2.5">
          <LoginField
            label="Contraseña"
            icon={Lock}
            placeholder="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            right={
              <Pressable onPress={() => setShowPassword((s) => !s)} accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} hitSlop={10}>
                {showPassword ? <EyeOff size={18} color="rgba(255,255,255,0.6)" /> : <Eye size={18} color="rgba(255,255,255,0.6)" />}
              </Pressable>
            }
          />
          <Pressable onPress={() => setView('forgot')} className="self-end py-1">
            <Text className="text-[13px] font-semibold text-accent">¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>
        <LoginButton label="Entrar" loadingLabel="Entrando…" onPress={submit} loading={loading} />
      </View>
    );

  return (
    <OnNavyTheme>
      <StatusBar style="light" />
      <KeyboardAvoidingView className="flex-1 bg-navy" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AnimatedBackdrop />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 36, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View className={`flex-1 w-full max-w-[400px] self-center ${isDesktop ? 'justify-center' : ''}`}>
            <View className="items-center mb-10">
              <Image source={logoOnNavy} style={{ width: 220, height: 85 }} resizeMode="contain" />
            </View>
            {form}
          </View>
          <Text className="text-[12px] text-center text-white/45 pt-10">{MAKER_CREDIT}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnNavyTheme>
  );
}
