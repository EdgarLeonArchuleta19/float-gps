import React, { useRef } from 'react';
import { Animated, GestureResponderEvent, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: 'style' });

const NATIVE = Platform.OS !== 'web';

export function tapFeedback(kind: 'select' | 'success' | 'warning' = 'select') {
  if (!NATIVE) return;
  const run =
    kind === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'warning'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        : Haptics.selectionAsync();
  run.catch(() => {});
}

export type TappableProps = Omit<PressableProps, 'style' | 'children'> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
};

export default function Tappable({ className, style, scaleTo = 0.96, haptic, onPressIn, onPressOut, onPress, children, ...props }: TappableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const springTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: NATIVE, speed: 40, bounciness: value === 1 ? 8 : 0 }).start();

  return (
    <AnimatedPressable
      {...props}
      className={className}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e: GestureResponderEvent) => {
        if (!reduced && !props.disabled) springTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        springTo(1);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) tapFeedback();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
