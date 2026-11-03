import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const NATIVE = Platform.OS !== 'web';
const SIZE = 56;
export const TAB_OVERHANG = 22;

export default function FeaturedTab({ icon: Icon, label, active, onPress }: { icon: LucideIcon; label: string; active: boolean; onPress: () => void }) {
  const { t } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className="flex-1 items-center active:opacity-85"
    >
      <View style={{ width: SIZE, height: SIZE, marginTop: -TAB_OVERHANG - 6, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 2,
            borderColor: '#f87203',
            opacity,
            transform: [{ scale }],
          }}
        />
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: '#032347',
            borderWidth: 3,
            borderColor: '#f87203',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#032347',
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Icon size={26} color={active ? '#f87203' : '#ffffff'} strokeWidth={2.2} />
        </View>
      </View>
      <Text className="text-[10.5px] font-semibold mt-1" style={{ color: active ? (t.isDark ? '#f87203' : '#032347') : t.hex.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}
