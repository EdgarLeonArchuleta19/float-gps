import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Wordmark from '@/components/brand/Wordmark';

export default function AdminWordmark({ size = 20, onDark }: { size?: number; onDark?: boolean }) {
  const { t } = useTheme();
  const light = onDark ?? t.isDark;
  return (
    <View className="flex-row items-center" style={{ gap: size * 0.35 }}>
      <Wordmark size={size} onDark={light} />
      <Text style={{ fontSize: size, fontWeight: '300', letterSpacing: -0.3, color: light ? 'rgba(255,255,255,0.75)' : '#5b6474' }}>Admin</Text>
    </View>
  );
}
