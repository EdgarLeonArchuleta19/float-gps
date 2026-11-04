import { Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import HeaderActions from './HeaderActions';
import { APP_NAME } from '@/lib/brand';

export default function DesktopTopBar({ alerts }: { alerts: number }) {
  const { user } = useAuth();
  const { t } = useTheme();
  return (
    <View className={`${t.card} border-b ${t.border}`}>
      <View className="flex-row items-center justify-between h-16 px-6">
        <View>
          <Text className={`text-[15px] font-bold ${t.text}`}>{user?.companyName || APP_NAME}</Text>
          <Text className={`text-[11px] ${t.muted}`}>Panel de operación</Text>
        </View>
        <HeaderActions alerts={alerts} />
      </View>
    </View>
  );
}
