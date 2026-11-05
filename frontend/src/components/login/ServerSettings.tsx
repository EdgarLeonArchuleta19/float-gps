import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, Server } from 'lucide-react-native';
import { checkServer, getApiUrl, normalizeServer, serverOrigin, setServerUrl } from '@/lib/apiUrl';
import { ErrorBanner } from '@/components/ui';
import LoginField from './LoginField';
import LoginButton from './LoginButton';

export function ServerLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-center gap-1.5 py-2" accessibilityLabel="Cambiar servidor">
      <Server size={13} color="rgba(255,255,255,0.55)" />
      <Text className="text-[12px] text-white/55" numberOfLines={1}>
        {serverOrigin().replace(/^https?:\/\//, '')}
      </Text>
      <Text className="text-[12px] font-semibold text-accent">Cambiar</Text>
    </Pressable>
  );
}

export default function ServerSettings({ onBack }: { onBack: () => void }) {
  const [value, setValue] = useState(serverOrigin());
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const apiUrl = normalizeServer(value);
    if (!apiUrl) {
      setError('Escribe una dirección completa, por ejemplo https://mi-servidor.com');
      return;
    }
    setChecking(true);
    setError('');
    const ok = await checkServer(apiUrl);
    setChecking(false);
    if (!ok) {
      setError('No se encontró un servidor de floaGPS en esa dirección.');
      return;
    }
    await setServerUrl(apiUrl);
    onBack();
  };

  const reset = async () => {
    await setServerUrl(null);
    setValue(serverOrigin());
    setError('');
  };

  return (
    <View className="gap-5">
      <Pressable onPress={onBack} className="flex-row items-center gap-1.5 self-start py-1" accessibilityLabel="Volver">
        <ArrowLeft size={18} color="rgba(255,255,255,0.75)" />
        <Text className="text-[13px] font-semibold text-white/75">Volver</Text>
      </Pressable>
      <View>
        <Text className="text-[26px] font-bold tracking-tight text-white">Servidor</Text>
        <Text className="text-[13px] text-white/60 mt-1">Dirección del servidor de floaGPS al que se conecta esta app.</Text>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <LoginField
        label="Dirección"
        icon={Server}
        placeholder="https://mi-servidor.com"
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={save}
      />
      <LoginButton label="Probar y guardar" loadingLabel="Probando conexión…" onPress={save} loading={checking} />
      {getApiUrl() !== normalizeServer(value) ? null : (
        <Pressable onPress={reset} className="self-center py-1">
          <Text className="text-[12.5px] font-semibold text-white/60">Usar el servidor predeterminado</Text>
        </Pressable>
      )}
    </View>
  );
}
