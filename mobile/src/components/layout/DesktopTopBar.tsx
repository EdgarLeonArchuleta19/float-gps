import { Text, View } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { OnNavyTheme } from '@/context/ThemeContext';
import AnimatedBackdrop from '@/components/brand/AnimatedBackdrop';
import HeaderActions from './HeaderActions';
import { NAVY_BAR_SHADOW } from './MobileTopBar';
import { APP_NAME } from '@/lib/brand';

export default function DesktopTopBar({ alerts }: { alerts: number }) {
  const { user } = useAuth();
  return (
    <OnNavyTheme>
      <View className="bg-navy overflow-hidden" style={[NAVY_BAR_SHADOW, { borderBottomWidth: 3, borderColor: '#f87203' }]}>
        <AnimatedBackdrop variant="bar" />
        <View className="flex-row items-center justify-between h-16 px-6">
          <View className="flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-lg items-center justify-center bg-white/10">
              <Building2 size={16} color="#f87203" />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-white">{user?.companyName || APP_NAME}</Text>
              <Text className="text-[11px] text-white/60">Panel de operación</Text>
            </View>
          </View>
          <HeaderActions alerts={alerts} />
        </View>
      </View>
    </OnNavyTheme>
  );
}
