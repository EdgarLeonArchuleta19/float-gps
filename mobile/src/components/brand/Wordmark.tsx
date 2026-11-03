import { Image, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const markLight = require('../../../assets/images/brand-mark.png');
const markDark = require('../../../assets/images/brand-mark-dark.png');

export function BrandMark({ size = 32, onDark }: { size?: number; onDark?: boolean }) {
  const { t } = useTheme();
  const dark = onDark ?? t.isDark;
  return <Image source={dark ? markDark : markLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

export default function Wordmark({ size = 20, onDark }: { size?: number; onDark?: boolean }) {
  const { t } = useTheme();
  const light = onDark ?? t.isDark;
  return (
    <View className="flex-row items-center" style={{ gap: size * 0.45 }}>
      <BrandMark size={size * 1.5} onDark={light} />
      <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -0.5, color: light ? '#ffffff' : '#032347' }}>
        floa<Text style={{ color: '#f87203' }}>GPS</Text>
      </Text>
    </View>
  );
}
