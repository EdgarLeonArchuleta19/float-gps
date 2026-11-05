import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import Tappable from '@/components/shared/Tappable';
import { NAVY, ORANGE } from '@/lib/brand';

const SIZE = 58;
export const TAB_OVERHANG = 18;

export default function FeaturedTab({ icon: Icon, label, active, onPress }: { icon: LucideIcon; label: string; active: boolean; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Tappable
      onPress={onPress}
      haptic
      scaleTo={0.9}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className="flex-1 items-center"
    >
      <View
        style={{
          width: SIZE,
          height: SIZE,
          marginTop: -TAB_OVERHANG - 4,
          borderRadius: 20,
          backgroundColor: NAVY,
          borderWidth: t.isDark ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: NAVY,
          shadowOpacity: t.isDark ? 0.5 : 0.28,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Icon size={26} color={active ? ORANGE : '#ffffff'} strokeWidth={2.2} />
      </View>
      <Text className="text-[11px] mt-1.5" style={{ color: active ? t.hex.text : t.hex.muted, fontWeight: active ? '700' : '600' }}>
        {label}
      </Text>
    </Tappable>
  );
}
