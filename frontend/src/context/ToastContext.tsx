import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | undefined>(undefined);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLORS = { success: '#22c55e', error: '#ef4444', info: '#f87203' };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ kind, message });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const Icon = toast ? ICONS[toast.kind] : null;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && Icon && (
        <View
          pointerEvents="none"
          style={{ top: insets.top + 12 }}
          className="absolute left-0 right-0 items-center px-4 z-50"
        >
          <View className="flex-row items-center gap-2 rounded-2xl bg-ink-card border border-ink-border px-4 py-3 max-w-[440px]">
            <Icon size={18} color={COLORS[toast.kind]} />
            <Text className="text-white text-[13px] font-medium flex-shrink">{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
