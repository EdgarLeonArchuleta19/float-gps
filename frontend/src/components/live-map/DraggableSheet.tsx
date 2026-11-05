import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, View, useWindowDimensions } from 'react-native';
import { TAB_OVERHANG } from '@/components/layout/FeaturedTab';
import { useTheme } from '@/context/ThemeContext';

export type SheetSnap = 'peek' | 'half' | 'full';

const PEEK_HEIGHT = 150;
const HANDLE_HEIGHT = 28;
const FIT_GAP = 14;

export default function DraggableSheet({
  snap,
  onSnapChange,
  header,
  children,
  fit,
  onCoverChange,
}: {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  header: React.ReactNode;
  children: React.ReactNode;
  fit?: boolean;
  onCoverChange?: (height: number) => void;
}) {
  const { t } = useTheme();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.82);
  const [contentHeight, setContentHeight] = useState(0);
  const fitHeight = fit && contentHeight ? Math.min(sheetHeight, contentHeight + HANDLE_HEIGHT + TAB_OVERHANG + FIT_GAP) : 0;

  const offsets = useMemo(
    () => ({
      full: 0,
      half: sheetHeight - (fitHeight || Math.round(height * 0.52)),
      peek: sheetHeight - PEEK_HEIGHT,
    }),
    [height, sheetHeight, fitHeight]
  );

  const translateY = useRef(new Animated.Value(offsets[snap])).current;
  const current = useRef(offsets[snap]);
  const startY = useRef(0);
  const snapRef = useRef(onSnapChange);
  snapRef.current = onSnapChange;

  useEffect(() => {
    current.current = offsets[snap];
    Animated.spring(translateY, { toValue: offsets[snap], useNativeDriver: false, bounciness: 2, speed: 14 }).start();
    onCoverChange?.(sheetHeight - offsets[snap]);
  }, [snap, offsets, translateY, sheetHeight, onCoverChange]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          startY.current = current.current;
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(offsets.peek, Math.max(0, startY.current + g.dy));
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const projected = startY.current + g.dy + g.vy * 120;
          const candidates: SheetSnap[] = ['full', 'half', 'peek'];
          const target = candidates.reduce((best, s) =>
            Math.abs(offsets[s] - projected) < Math.abs(offsets[best] - projected) ? s : best
          );
          current.current = offsets[target];
          Animated.spring(translateY, { toValue: offsets[target], useNativeDriver: false, bounciness: 2, speed: 14 }).start();
          snapRef.current(target);
        },
      }),
    [offsets, translateY]
  );

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 bottom-0" style={{ height: sheetHeight }}>
      <Animated.View style={{ height: sheetHeight, transform: [{ translateY }] }}>
        <View
          className={`flex-1 rounded-t-3xl ${t.card}`}
          style={{ shadowColor: '#000', shadowOpacity: t.isDark ? 0.45 : 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 16 }}
        >
          <View {...responder.panHandlers} className="pt-3 pb-1">
            <View className={`self-center w-10 h-1.5 rounded-full mb-3 ${t.isDark ? 'bg-ink-border' : 'bg-gray-300'}`} />
            {header}
          </View>
          <View className="flex-1" style={{ paddingBottom: offsets[snap] + (fit ? 0 : TAB_OVERHANG) }}>
            {fit ? (
              <ScrollView contentContainerStyle={{ paddingBottom: TAB_OVERHANG + FIT_GAP }} showsVerticalScrollIndicator={false}>
                <View onLayout={(e) => setContentHeight(Math.ceil(e.nativeEvent.layout.height))}>{children}</View>
              </ScrollView>
            ) : (
              children
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
