import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AlertTriangle, HelpCircle } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { Button } from '@/components/ui';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  icon?: LucideIcon;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | undefined>(undefined);
const NATIVE = Platform.OS !== 'web';

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!options) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, speed: 18, bounciness: 8, useNativeDriver: NATIVE }).start();
  }, [options, pop]);

  const confirm = useCallback<Confirm>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    []
  );

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  const Icon = options?.icon || (options?.destructive ? AlertTriangle : HelpCircle);
  const tone = options?.destructive ? '#ef4444' : t.hex.onSelected;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(false)}>
        <View className="flex-1 items-center justify-center p-6">
          <Pressable className="absolute inset-0" style={{ backgroundColor: 'rgba(8,10,18,0.5)' }} onPress={() => close(false)} accessibilityLabel="Cancelar" />
          {options ? (
            <Animated.View
              className={`w-full rounded-3xl px-6 pt-7 pb-6 items-center ${t.modal}`}
              style={{
                maxWidth: 380,
                opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              }}
            >
              <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: options.destructive ? '#ef44441f' : t.hex.selected }}>
                <Icon size={26} color={tone} />
              </View>
              <Text className={`text-[19px] font-extrabold tracking-tight text-center mb-2 ${t.text}`}>{options.title}</Text>
              <Text className={`text-[14px] leading-5 text-center ${t.muted}`}>{options.message}</Text>
              <View className="self-stretch gap-2 mt-6">
                <Button label={options.confirmLabel} variant={options.destructive ? 'danger' : 'primary'} onPress={() => close(true)} />
                <Button label="Cancelar" variant="ghost" onPress={() => close(false)} />
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
