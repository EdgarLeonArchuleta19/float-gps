import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import VehicleIcon from '@/components/shared/VehicleIcon';

const NATIVE = Platform.OS !== 'web';

function useLoop(duration: number, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [value, duration, delay]);
  return value;
}

function useBounce(duration: number, delay: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [value, duration, delay]);
  return value;
}

function Pulse({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const v = useLoop(3200, delay);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
  const opacity = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - 15,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: '#ffffff',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function FloatingDot({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const v = useBounce(2600 + delay / 2, delay);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY }] }}
    />
  );
}

function DrivingCar({ width, y }: { width: number; y: number }) {
  const v = useLoop(9000, 400);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-60, width + 60] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: y - 15, transform: [{ translateX }] }}>
      <VehicleIcon kind="vehicle" color="#f87203" size={30} heading={90} />
    </Animated.View>
  );
}

const CURVE = [0.5, 0.38, 0.62, 0.42];

export default function AnimatedBackdrop() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  const { width, height } = size;

  const roadY = height * 0.86;
  const radar = { x: width * 0.82, y: height * 0.14, size: Math.max(width, 360) * 0.95 };
  const [c0, c1, c2, c3] = CURVE;

  return (
    <View pointerEvents="none" onLayout={onLayout} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {width ? (
        <>
          <Svg width={width} height={height} style={{ position: 'absolute' }}>
            <Path
              d={`M ${-20} ${height * c0} C ${width * 0.3} ${height * c1}, ${width * 0.55} ${height * c2}, ${width + 20} ${height * c3}`}
              stroke="#f87203"
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeDasharray="6 8"
              fill="none"
            />
            <Line x1={0} y1={roadY} x2={width} y2={roadY} stroke="#ffffff" strokeOpacity={0.08} strokeWidth={14} />
            <Line x1={0} y1={roadY} x2={width} y2={roadY} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="10 12" />
          </Svg>
          <Pulse x={radar.x} y={radar.y} size={radar.size} delay={0} />
          <Pulse x={radar.x} y={radar.y} size={radar.size} delay={1060} />
          <Pulse x={radar.x} y={radar.y} size={radar.size} delay={2120} />
          <View style={{ position: 'absolute', left: radar.x - 6, top: radar.y - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#f87203' }} />
          <FloatingDot x={width * 0.12} y={height * 0.22} size={6} color="#f87203" delay={0} />
          <FloatingDot x={width * 0.28} y={height * 0.66} size={4} color="#ffffff" delay={700} />
          <FloatingDot x={width * 0.68} y={height * 0.5} size={5} color="#ffffff" delay={1300} />
          <FloatingDot x={width * 0.9} y={height * 0.7} size={6} color="#f87203" delay={1900} />
          <DrivingCar width={width} y={roadY} />
        </>
      ) : null}
    </View>
  );
}
