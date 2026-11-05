import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { OnNavyTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { api } from '@/lib/api';
import { MAKER_BRAND } from '@/lib/brand';
import { isStrongPassword } from '@/lib/passwordPolicy';
import { forgetEngineCredential } from '@/lib/engineCredential';
import { ErrorBanner } from '@/components/ui';
import AnimatedBackdrop from '@/components/brand/AnimatedBackdrop';
import LoginField from '@/components/login/LoginField';
import LoginButton from '@/components/login/LoginButton';
import PasswordChecklist from '@/components/shared/PasswordChecklist';

const logoOnNavy = require('../../../assets/images/logo-floa-black.png');

function EyeToggle({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <Pressable onPress={onPress} accessibilityLabel={visible ? 'Ocultar contraseña' : 'Ver contraseña'} hitSlop={10}>
      <Icon size={18} color="rgba(255,255,255,0.6)" />
    </Pressable>
  );
}

export default function SetPassword() {
  const { user, restoring, passwordChanged, logout } = useAuth();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!restoring && !user) return <Redirect href="/login" />;
  if (!restoring && user && !user.mustChangePassword) return <Redirect href="/live-map" />;

  const mismatch = !!confirm && password !== confirm;
  const canSave = isStrongPassword(password) && password === confirm;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const { token } = await api.auth.changePassword('', password);
      passwordChanged(token);
      await forgetEngineCredential();
      router.replace('/live-map');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
            <View className="gap-5">
              <View>
                <Text className="text-[28px] font-bold tracking-tight text-white">Crea tu contraseña</Text>
                <Text className="text-[13.5px] mt-1 text-white/70">
                  {user ? `Hola, ${user.name}. ` : ''}Entraste con una contraseña temporal; elige una propia para seguir.
                </Text>
              </View>
              {error ? <ErrorBanner message={error} /> : null}
              <LoginField
                icon={KeyRound}
                label="Nueva contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                right={<EyeToggle visible={showPassword} onPress={() => setShowPassword((v) => !v)} />}
              />
              <PasswordChecklist password={password} />
              <LoginField
                icon={KeyRound}
                label="Confirmar contraseña"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={save}
                right={<EyeToggle visible={showConfirm} onPress={() => setShowConfirm((v) => !v)} />}
              />
              {mismatch ? <ErrorBanner message="Las contraseñas no coinciden" /> : null}
              <LoginButton label="Guardar y entrar" loadingLabel="Guardando…" onPress={save} loading={saving} disabled={!canSave} />
              <Pressable onPress={logout} className="self-center py-2">
                <Text className="text-[13px] font-semibold text-white/70">Salir</Text>
              </Pressable>
            </View>
          </View>
          <Text className="text-[12px] text-center text-white/45 pt-10">{MAKER_BRAND}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnNavyTheme>
  );
}
