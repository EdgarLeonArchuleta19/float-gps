import { Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import HeaderActions from './HeaderActions';
import { APP_NAME } from '@/lib/brand';

export default function DesktopTopBar({ alerts }: { alerts: number }) {
  const { user } = useAuth();
  return (
    <View className="bg-navy border-b border-white/10">
      <View className="flex-row items-center justify-between h-16 px-6">
        <View>
          <Text className="text-[15px] font-bold text-white">{user?.companyName || APP_NAME}</Text>
          <Text className="text-[11px] text-white/60">Panel de operación</Text>
        </View>
        <HeaderActions alerts={alerts} onNavy />
      </View>
    </View>
  );
}
