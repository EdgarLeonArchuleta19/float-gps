import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Wordmark from '@/components/brand/Wordmark';
import AnimatedBackdrop from '@/components/brand/AnimatedBackdrop';
import { OnNavyTheme } from '@/context/ThemeContext';
import HeaderActions from './HeaderActions';

export const NAVY_BAR_SHADOW = {
  shadowColor: '#032347',
  shadowOpacity: 0.35,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 10,
  zIndex: 10,
};

export default function MobileTopBar({ alerts }: { alerts: number }) {
  const insets = useSafeAreaInsets();
  return (
    <OnNavyTheme>
      <StatusBar style="light" />
      <View style={[NAVY_BAR_SHADOW, { borderBottomLeftRadius: 26, borderBottomRightRadius: 26, backgroundColor: '#032347' }]}>
        <View
          className="bg-navy overflow-hidden"
          style={{ paddingTop: insets.top, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, borderBottomWidth: 3, borderColor: '#f87203' }}
        >
          <AnimatedBackdrop variant="bar" />
          <View className="flex-row items-center justify-between h-16 pl-5 pr-3">
            <Wordmark size={18} onDark />
            <HeaderActions alerts={alerts} />
          </View>
        </View>
      </View>
    </OnNavyTheme>
  );
}
