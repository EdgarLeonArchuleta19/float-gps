import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, LifeBuoy } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

function minutesLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000));
}

export default function SupportBanner() {
  const { support, exitSupport } = useAuth();
  const [left, setLeft] = useState(() => (support ? minutesLeft(support.expiresAt) : 0));

  useEffect(() => {
    if (!support) return;
    setLeft(minutesLeft(support.expiresAt));
    const id = setInterval(() => setLeft(minutesLeft(support.expiresAt)), 30000);
    return () => clearInterval(id);
  }, [support]);

  if (!support) return null;
  const back = async () => {
    await exitSupport();
    router.replace('/console');
  };
  return (
    <View className="flex-row items-center justify-between gap-3 bg-navy px-4 py-2">
      <View className="flex-row items-center gap-2 flex-1">
        <LifeBuoy size={15} color="#f87203" />
        <Text className="text-white text-[12px] flex-1" numberOfLines={1}>
          Modo Soporte · <Text className="font-bold">{support.company.name}</Text> · {support.reason} · quedan {left} min
        </Text>
      </View>
      <Pressable onPress={back} className="flex-row items-center gap-1 rounded-full bg-white/10 px-3 py-1 active:opacity-70">
        <ArrowLeft size={13} color="#ffffff" />
        <Text className="text-white text-[11px] font-semibold">Salir a la consola</Text>
      </Pressable>
    </View>
  );
}
