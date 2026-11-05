import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
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

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

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
  const tone = options?.destructive ? '#ef4444' : t.hex.primary;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(false)}>
        <View className="flex-1 items-center justify-center p-6">
          <Pressable className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => close(false)} accessibilityLabel="Cancelar" />
          {options ? (
            <View className={`w-full rounded-2xl border p-5 ${t.modal} ${t.border}`} style={{ maxWidth: 400 }}>
              <View className="w-11 h-11 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${tone}1f` }}>
                <Icon size={20} color={tone} />
              </View>
              <Text className={`text-[16px] font-bold mb-1.5 ${t.text}`}>{options.title}</Text>
              <Text className={`text-[13px] leading-5 ${t.muted}`}>{options.message}</Text>
              <View className="flex-row gap-2 mt-5">
                <Button label="Cancelar" variant="secondary" onPress={() => close(false)} className="flex-1" />
                <Button label={options.confirmLabel} variant={options.destructive ? 'danger' : 'primary'} onPress={() => close(true)} className="flex-1" />
              </View>
            </View>
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
