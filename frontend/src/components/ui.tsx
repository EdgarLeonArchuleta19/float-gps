import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { markerColor, statusLabel } from '@/lib/format';
import { TAB_OVERHANG } from '@/components/layout/FeaturedTab';

export function Screen({
  children,
  refreshing,
  onRefresh,
  maxWidth = 1200,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  maxWidth?: number;
}) {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  return (
    <ScrollView
      className={`flex-1 ${t.screen}`}
      contentContainerStyle={{ padding: isDesktop ? 24 : 16, paddingBottom: isDesktop ? 32 : 32 + TAB_OVERHANG, width: '100%', maxWidth, alignSelf: 'center' }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.hex.primary} />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  back,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: string;
}) {
  const { t } = useTheme();
  const showBack = !!back;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(back as never));
  return (
    <View className="flex-row items-center justify-between mb-5 gap-3">
      {showBack ? (
        <Pressable
          onPress={goBack}
          accessibilityLabel="Volver"
          className={`w-9 h-9 rounded-xl items-center justify-center border ${t.card} ${t.border} active:opacity-70`}
        >
          <ChevronLeft size={19} color={t.hex.text} />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text className={`text-[24px] font-bold tracking-tight ${t.text}`} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text className={`text-[13px] mt-0.5 ${t.muted}`}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  className = '',
  onPress,
}: {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}) {
  const { t } = useTheme();
  const base = `rounded-2xl border ${t.card} ${t.border} ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${base} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <View className="flex-row items-center justify-between mb-2 mt-5">
      <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>{children}</Text>
      {right}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  loading,
  disabled,
  className = '',
  compact,
}: {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTheme();
  const styles: Record<ButtonVariant, { box: string; text: string; icon: string }> = {
    primary: {
      box: t.isDark ? 'bg-accent' : 'bg-navy',
      text: 'text-white',
      icon: '#ffffff',
    },
    secondary: { box: `${t.input} border ${t.border}`, text: t.text, icon: t.hex.text },
    danger: { box: 'bg-red-600', text: 'text-white', icon: '#ffffff' },
    ghost: { box: 'bg-transparent', text: t.muted, icon: t.hex.muted },
  };
  const s = styles[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`flex-row items-center justify-center gap-2 rounded-xl ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${s.box} ${
        inactive ? 'opacity-50' : 'active:opacity-80'
      } ${className}`}
    >
      {loading ? <ActivityIndicator size="small" color={s.icon} /> : Icon ? <Icon size={compact ? 15 : 17} color={s.icon} /> : null}
      <Text className={`${compact ? 'text-[12px]' : 'text-[14px]'} font-semibold ${s.text}`}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  label,
  badge,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  badge?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      className={`w-10 h-10 rounded-xl items-center justify-center border ${t.input} ${t.border} active:opacity-70`}
    >
      <Icon size={18} color={t.hex.text} />
      {badge ? <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" /> : null}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon: Icon,
  count,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  count?: number;
}) {
  const { t } = useTheme();
  const activeBox = t.isDark ? 'bg-accent border-accent' : 'bg-navy border-navy';
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
        active ? activeBox : `${t.card} ${t.border}`
      } active:opacity-80`}
    >
      {Icon ? <Icon size={14} color={active ? '#ffffff' : t.hex.muted} /> : null}
      <Text className={`text-[12px] font-semibold ${active ? 'text-white' : t.text}`}>{label}</Text>
      {count !== undefined ? (
        <Text className={`text-[11px] font-semibold ${active ? 'text-white' : t.muted}`}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {children}
    </ScrollView>
  );
}

export function Field({ label, icon, search, ...props }: TextInputProps & { label?: string; icon?: LucideIcon; search?: boolean }) {
  const { t } = useTheme();
  const Icon = search ? Search : icon;
  return (
    <View className="gap-1.5">
      {label ? <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>{label}</Text> : null}
      <View className={`flex-row items-center gap-2 rounded-xl border px-3.5 ${search ? t.card : t.input} ${t.border}`}>
        {Icon ? <Icon size={17} color={t.hex.muted} /> : null}
        <TextInput
          placeholderTextColor={t.hex.muted}
          className={`flex-1 py-3 text-[14px] ${t.text}`}
          style={{ outlineStyle: 'none' } as any}
          {...props}
        />
      </View>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const color = markerColor(status);
  return (
    <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}22` }}>
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { t } = useTheme();
  return (
    <View className="py-16 items-center gap-3">
      <ActivityIndicator color={t.hex.primary} />
      <Text className={`text-[13px] ${t.muted}`}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message?: string }) {
  const { t } = useTheme();
  return (
    <View className="py-14 items-center px-6">
      <View className={`w-14 h-14 rounded-2xl items-center justify-center mb-3 ${t.input}`}>
        <Icon size={24} color={t.hex.muted} />
      </View>
      <Text className={`text-[15px] font-semibold ${t.text}`}>{title}</Text>
      {message ? <Text className={`text-[13px] mt-1 text-center ${t.muted}`}>{message}</Text> : null}
    </View>
  );
}

const NOTICE_TIMEOUT_MS = 30000;
const SHEET_NATIVE_DRIVER = Platform.OS !== 'web';

export function ErrorBanner({ message }: { message: string }) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), NOTICE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [message]);
  if (!visible) return null;
  return (
    <View className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-3">
      <Text className="text-[13px] font-medium text-red-500">{message}</Text>
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  const { t } = useTheme();
  return (
    <View className="flex-1 min-w-[120px]">
      <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>{label}</Text>
      <Text className={`text-[20px] font-bold mt-1 ${t.text}`}>{value}</Text>
      {hint ? <Text className={`text-[11px] mt-0.5 ${t.muted}`}>{hint}</Text> : null}
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const progress = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: SHEET_NATIVE_DRIVER }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: SHEET_NATIVE_DRIVER }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View className={`flex-1 ${isDesktop ? 'items-center justify-center p-6' : 'justify-end'}`}>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.42)', opacity: progress }} />
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Cerrar" />
        <Animated.View
          style={{
            width: '100%',
            maxWidth: isDesktop ? 460 : undefined,
            maxHeight: '90%',
            opacity: isDesktop ? progress : 1,
            transform: [
              isDesktop
                ? { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }
                : { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) },
            ],
          }}
        >
          <View
            className={`${t.modal} border ${t.border} ${isDesktop ? 'rounded-2xl' : 'rounded-t-3xl'}`}
            style={{ paddingBottom: isDesktop ? 20 : Math.max(insets.bottom, 16), flexShrink: 1 }}
          >
          {!isDesktop ? <View className={`self-center w-10 h-1 rounded-full mt-2.5 ${t.isDark ? 'bg-ink-border' : 'bg-gray-300'}`} /> : null}
          {title ? (
            <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
              <Text className={`text-[16px] font-bold ${t.text}`}>{title}</Text>
              <Pressable onPress={onClose} accessibilityLabel="Cerrar" className="p-1">
                <X size={20} color={t.hex.muted} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: title ? 4 : 16 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
