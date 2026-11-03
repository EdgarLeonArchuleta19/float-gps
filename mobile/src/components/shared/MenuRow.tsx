import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function MenuRow({
  icon: Icon,
  label,
  hint,
  onPress,
  badge,
  danger,
  last,
  right,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onPress?: () => void;
  badge?: number;
  danger?: boolean;
  last?: boolean;
  right?: React.ReactNode;
}) {
  const { t } = useTheme();
  const color = danger ? '#ef4444' : t.hex.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 ${last ? '' : `border-b ${t.border}`} active:opacity-70`}
    >
      <View className={`w-9 h-9 rounded-xl items-center justify-center ${t.input}`}>
        <Icon size={18} color={color} />
      </View>
      <View className="flex-1">
        <Text className={`text-[14px] font-semibold ${danger ? 'text-red-500' : t.text}`}>{label}</Text>
        {hint ? <Text className={`text-[12px] ${t.muted}`}>{hint}</Text> : null}
      </View>
      {badge ? (
        <View className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent items-center justify-center">
          <Text className="text-white text-[11px] font-bold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      {right ?? (onPress && !danger ? <ChevronRight size={16} color={t.hex.muted} /> : null)}
    </Pressable>
  );
}
