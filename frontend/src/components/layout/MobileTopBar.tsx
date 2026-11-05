import { View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Wordmark from '@/components/brand/Wordmark';
import Tappable from '@/components/shared/Tappable';
import HeaderActions, { ProfileAvatar } from './HeaderActions';

export default function MobileTopBar({ alerts }: { alerts: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-navy" style={{ paddingTop: insets.top, zIndex: 10 }}>
      <StatusBar style="light" />
      <View className="flex-row items-center h-14 px-4">
        <View className="flex-1 items-start">
          <Tappable onPress={() => router.push('/profile')} haptic scaleTo={0.9} accessibilityLabel="Mi perfil">
            <ProfileAvatar size={34} onNavy />
          </Tappable>
        </View>
        <Wordmark size={16} onDark />
        <View className="flex-1 items-end">
          <HeaderActions alerts={alerts} avatar={false} onNavy />
        </View>
      </View>
    </View>
  );
}
