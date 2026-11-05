import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { tapFeedback } from '@/components/shared/Tappable';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | undefined>(undefined);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLORS = { success: '#22c55e', error: '#ef4444', info: '#f87203' };
const NATIVE = Platform.OS !== 'web';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ kind, message });
      if (kind === 'success') tapFeedback('success');
      if (kind === 'error') tapFeedback('warning');
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, speed: 16, bounciness: 7, useNativeDriver: NATIVE }).start();
      timer.current = setTimeout(() => {
        Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }, 3200);
    },
    [progress]
  );

  const Icon = toast ? ICONS[toast.kind] : null;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && Icon && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: insets.top + 12,
            alignItems: 'center',
            paddingHorizontal: 16,
            zIndex: 50,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          }}
        >
          <View
            className="flex-row items-center gap-2.5 rounded-full bg-[#1d1d22] pl-3.5 pr-5 py-3 max-w-[440px]"
            style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}
          >
            <Icon size={19} color={COLORS[toast.kind]} />
            <Text className="text-white text-[13.5px] font-semibold flex-shrink">{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
