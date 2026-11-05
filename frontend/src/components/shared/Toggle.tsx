import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { NAVY, ORANGE } from '@/lib/brand';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Tappable from './Tappable';

const WIDTH = 52;
const HEIGHT = 32;
const THUMB = 24;
const TRAVEL = WIDTH - THUMB - 8;

export default function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  const { t } = useTheme();
  const reduced = useReducedMotion();
  const offset = useRef(new Animated.Value(value ? TRAVEL : 0)).current;

  useEffect(() => {
    if (reduced) offset.setValue(value ? TRAVEL : 0);
    else Animated.spring(offset, { toValue: value ? TRAVEL : 0, useNativeDriver: false, speed: 20, bounciness: 6 }).start();
  }, [value, reduced, offset]);

  return (
    <Tappable
      onPress={() => onChange(!value)}
      disabled={disabled}
      haptic
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      className={`rounded-full justify-center ${disabled ? 'opacity-40' : ''}`}
      style={{ width: WIDTH, height: HEIGHT, padding: 4, backgroundColor: value ? NAVY : t.hex.border }}
    >
      <Animated.View
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: value ? ORANGE : '#ffffff',
          transform: [{ translateX: offset }],
        }}
      />
    </Tappable>
  );
}
