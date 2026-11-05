import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import type { LucideIcon } from 'lucide-react-native';
import { AlertCircle, ChevronLeft, Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { markerColor, statusLabel } from '@/lib/format';
import { TAB_OVERHANG } from '@/components/layout/FeaturedTab';
import Tappable from '@/components/shared/Tappable';
import { ORANGE } from '@/lib/brand';

cssInterop(Animated.View, { className: 'style' });

const NATIVE_DRIVER = Platform.OS !== 'web';

export const FLOAT_SHADOW = {
  shadowColor: '#0b1220',
  shadowOpacity: 0.14,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
};

export function useEntrance(delay = 0, fade = true) {
  const reduced = useReducedMotion();
  const value = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    Animated.timing(value, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start(({ finished }) => {
      if (!finished) value.setValue(1);
    });
  }, [value, delay, reduced]);
  const slide = { transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0], extrapolate: 'clamp' as const }) }] };
  return fade ? { opacity: value, ...slide } : slide;
}

export function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const style = useEntrance(delay);
  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}

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
  const entrance = useEntrance(0, false);
  return (
    <ScrollView
      className={`flex-1 ${t.screen}`}
      contentContainerStyle={{ padding: isDesktop ? 24 : 18, paddingTop: isDesktop ? 24 : 14, paddingBottom: isDesktop ? 32 : 36 + TAB_OVERHANG, width: '100%', maxWidth, alignSelf: 'center' }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.hex.primary} colors={[t.hex.primary]} />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View style={entrance}>{children}</Animated.View>
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
    <View className="mb-5 gap-3">
      {showBack || right ? (
        <View className="flex-row items-center justify-between gap-3">
          {showBack ? (
            <Tappable
              onPress={goBack}
              haptic
              accessibilityLabel="Volver"
              className={`w-11 h-11 rounded-full items-center justify-center ${t.card}`}
            >
              <ChevronLeft size={22} color={t.hex.brand} />
            </Tappable>
          ) : (
            <View />
          )}
          {right}
        </View>
      ) : null}
      <View>
        <Text className={`text-[28px] font-extrabold tracking-tight ${t.text}`} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text className={`text-[14px] mt-1 ${t.muted}`}>{subtitle}</Text> : null}
      </View>
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
  const base = `rounded-2xl ${t.card} ${className}`;
  if (onPress) {
    return (
      <Tappable onPress={onPress} scaleTo={0.98} className={base}>
        {children}
      </Tappable>
    );
  }
  return <View className={base}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <View className="flex-row items-center justify-between mb-3 mt-7 px-1">
      <Text className={`text-[16px] font-bold tracking-tight ${t.text}`}>{children}</Text>
      {right}
    </View>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'surface' | 'soft' | 'tonal' | 'danger' | 'dangerSoft' | 'ghost';

export function Button({
  label,
  onPress,
  icon: Icon,
  iconColor,
  variant = 'primary',
  loading,
  disabled,
  className = '',
  compact,
}: {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  iconColor?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTheme();
  const styles: Record<ButtonVariant, { box: string; text: string; icon: string }> = {
    primary: { box: 'bg-navy', text: 'text-white', icon: '#ffffff' },
    accent: { box: 'bg-accent', text: 'text-white', icon: '#ffffff' },
    secondary: { box: `bg-transparent border-[1.5px] ${t.isDark ? 'border-[#3a3b43]' : 'border-[#d9dce3]'}`, text: t.text, icon: t.hex.text },
    surface: { box: t.card, text: t.text, icon: t.hex.text },
    soft: { box: t.tonal, text: t.text, icon: t.hex.text },
    tonal: { box: t.selected, text: 'text-accent', icon: ORANGE },
    danger: { box: 'bg-red-600', text: 'text-white', icon: '#ffffff' },
    dangerSoft: { box: 'bg-red-500/10', text: 'text-red-600', icon: '#dc2626' },
    ghost: { box: 'bg-transparent', text: t.muted, icon: t.hex.muted },
  };
  const s = styles[variant];
  const inactive = disabled || loading;
  return (
    <Tappable
      onPress={onPress}
      disabled={inactive}
      haptic
      accessibilityRole="button"
      className={`flex-row items-center justify-center gap-2 rounded-full ${compact ? 'px-4 h-10' : 'px-5 h-[52px]'} ${s.box} ${
        inactive ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? <ActivityIndicator size="small" color={s.icon} /> : Icon ? <Icon size={compact ? 16 : 18} color={iconColor || s.icon} strokeWidth={2.2} /> : null}
      <Text className={`${compact ? 'text-[13px]' : 'text-[15px]'} font-bold ${s.text}`}>{label}</Text>
    </Tappable>
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
    <Tappable
      onPress={onPress}
      haptic
      accessibilityLabel={label}
      accessibilityRole="button"
      className={`w-11 h-11 rounded-full items-center justify-center ${t.card}`}
    >
      <Icon size={19} color={t.hex.brand} />
      {badge ? <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent" /> : null}
    </Tappable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon: Icon,
  count,
  surface,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  count?: number;
  surface?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Tappable
      onPress={onPress}
      haptic
      className={`flex-row items-center gap-1.5 rounded-full px-4 h-10 ${active ? 'bg-navy' : surface ? t.tonal : t.card}`}
    >
      {Icon ? <Icon size={15} color={active ? '#ffffff' : t.hex.muted} /> : null}
      <Text className={`text-[13px] font-semibold ${active ? 'text-white' : t.text}`}>{label}</Text>
      {count !== undefined ? (
        <Text className={`text-[12px] font-semibold ${active ? 'text-white/80' : t.muted}`}>{count}</Text>
      ) : null}
    </Tappable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {children}
    </ScrollView>
  );
}

const OUTLINE_LIGHT = '#d3d6de';
const OUTLINE_DARK = '#3e3f49';

export function Field({
  label,
  icon,
  search,
  right,
  outlined,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label?: string; icon?: LucideIcon; search?: boolean; right?: React.ReactNode; outlined?: boolean }) {
  const { t } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const Icon = search ? Search : icon;
  const focusColor = ORANGE;
  return (
    <View className="gap-2">
      {label ? <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>{label}</Text> : null}
      <View
        className={`flex-row items-center gap-2.5 px-4 ${search ? `rounded-full ${t.card}` : outlined ? `rounded-xl ${t.card}` : `rounded-xl ${t.input}`}`}
        style={{ borderWidth: 1.5, borderColor: focused ? focusColor : outlined ? (t.isDark ? OUTLINE_DARK : OUTLINE_LIGHT) : 'transparent', minHeight: search ? 48 : 54 }}
      >
        {Icon ? <Icon size={18} color={focused ? focusColor : t.hex.muted} /> : null}
        <TextInput
          placeholderTextColor={t.hex.muted}
          className={`flex-1 py-3 text-[15px] ${t.text}`}
          style={{ outlineStyle: 'none' } as any}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const color = markerColor(status);
  return (
    <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: `${color}1f` }}>
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-[12px] font-semibold" style={{ color }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: object }) {
  const { t } = useTheme();
  const reduced = useReducedMotion();
  const pulse = React.useRef(new Animated.Value(0.55)).current;
  React.useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);
  return <Animated.View className={`${t.isDark ? 'bg-ink-active' : 'bg-[#e6e7ec]'} ${className}`} style={[{ opacity: pulse }, style]} />;
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { t } = useTheme();
  return (
    <View className="py-2 gap-3" accessibilityLabel={label} accessibilityRole="progressbar">
      {[0, 1, 2].map((i) => (
        <View key={i} className={`rounded-2xl p-4 flex-row items-center gap-3 ${t.card}`}>
          <Skeleton className="w-11 h-11 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3.5 rounded-full" style={{ width: `${70 - i * 12}%` }} />
            <Skeleton className="h-3 rounded-full" style={{ width: `${45 - i * 6}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message?: string }) {
  const { t } = useTheme();
  return (
    <View className="py-14 items-center px-6">
      <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${t.selected}`}>
        <Icon size={26} color={t.hex.onSelected} />
      </View>
      <Text className={`text-[16px] font-bold ${t.text}`}>{title}</Text>
      {message ? <Text className={`text-[14px] mt-1.5 text-center leading-5 ${t.muted}`}>{message}</Text> : null}
    </View>
  );
}

const NOTICE_TIMEOUT_MS = 30000;

export function ErrorBanner({ message }: { message: string }) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), NOTICE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [message]);
  if (!visible) return null;
  return (
    <View className="flex-row items-center gap-2.5 rounded-xl bg-red-500/10 px-4 py-3.5 mb-3">
      <AlertCircle size={18} color="#ef4444" />
      <Text className="flex-1 text-[13.5px] font-medium text-red-500">{message}</Text>
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  const { t } = useTheme();
  return (
    <View className="flex-1 min-w-[120px]">
      <Text className={`text-[13px] font-medium ${t.muted}`}>{label}</Text>
      <Text className={`text-[22px] font-extrabold tracking-tight mt-1 ${t.text}`}>{value}</Text>
      {hint ? <Text className={`text-[12px] mt-0.5 ${t.muted}`}>{hint}</Text> : null}
    </View>
  );
}

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.9;

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
  const { height } = useWindowDimensions();
  const progress = React.useRef(new Animated.Value(0)).current;
  const drag = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (visible) {
      drag.setValue(0);
      setMounted(true);
      Animated.spring(progress, { toValue: 1, speed: 16, bounciness: 3, useNativeDriver: NATIVE_DRIVER }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress, drag]);

  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) closeRef.current();
          else Animated.spring(drag, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: NATIVE_DRIVER }).start();
        },
        onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: NATIVE_DRIVER }).start(),
      }),
    [drag]
  );

  const slide = Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }), drag);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View className={`flex-1 ${isDesktop ? 'items-center justify-center p-6' : 'justify-end'}`}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(8,10,18,0.45)',
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          }}
        />
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Cerrar" />
        <Animated.View
          style={{
            width: '100%',
            maxWidth: isDesktop ? 460 : undefined,
            maxHeight: '92%',
            opacity: isDesktop ? progress : 1,
            transform: [isDesktop ? { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) } : { translateY: slide }],
          }}
        >
          <View
            className={`${t.modal} ${isDesktop ? 'rounded-3xl' : 'rounded-t-3xl'}`}
            style={{ paddingBottom: isDesktop ? 22 : Math.max(insets.bottom, 18), flexShrink: 1 }}
          >
            <View {...(isDesktop ? {} : pan.panHandlers)}>
              {!isDesktop ? <View className={`self-center w-10 h-1.5 rounded-full mt-3 ${t.isDark ? 'bg-ink-border' : 'bg-gray-300'}`} /> : null}
              {title ? (
                <View className="flex-row items-center justify-between pl-6 pr-4 pt-4 pb-2">
                  <Text className={`flex-1 text-[19px] font-extrabold tracking-tight ${t.text}`}>{title}</Text>
                  <Tappable onPress={onClose} accessibilityLabel="Cerrar" className={`w-9 h-9 rounded-full items-center justify-center ${t.tonal}`}>
                    <X size={18} color={t.hex.muted} />
                  </Tappable>
                </View>
              ) : (
                <View className="h-3" />
              )}
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: title ? 6 : 8 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
