import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, LifeBuoy } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

export default function SupportBanner() {
  const { supportCompany, exitSupport } = useAuth();
  if (!supportCompany) return null;
  const back = () => {
    exitSupport();
    router.replace('/owner-panel');
  };
  return (
    <View className="flex-row items-center justify-between gap-3 bg-navy px-4 py-2">
      <View className="flex-row items-center gap-2 flex-1">
        <LifeBuoy size={15} color="#f87203" />
        <Text className="text-white text-[12px] flex-1" numberOfLines={1}>
          Modo Soporte · <Text className="font-bold">{supportCompany.name}</Text>
        </Text>
      </View>
      <Pressable onPress={back} className="flex-row items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 active:opacity-70">
        <ArrowLeft size={13} color="#ffffff" />
        <Text className="text-white text-[11px] font-semibold">Panel de Dueño</Text>
      </Pressable>
    </View>
  );
}
