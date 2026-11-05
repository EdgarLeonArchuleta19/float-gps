import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { tapFeedback } from './Tappable';

export default function MenuRow({
  icon: Icon,
  iconColor,
  label,
  hint,
  onPress,
  badge,
  danger,
  last,
  right,
}: {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  hint?: string;
  onPress?: () => void;
  badge?: number;
  danger?: boolean;
  last?: boolean;
  right?: React.ReactNode;
}) {
  const { t } = useTheme();
  const color = danger ? '#ef4444' : iconColor || t.hex.brand;
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              tapFeedback();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      className={`flex-row items-center gap-3.5 pl-4 ${t.press}`}
    >
      <View
        className={`w-11 h-11 rounded-full items-center justify-center ${danger ? 'bg-red-500/10' : iconColor ? '' : t.tonal}`}
        style={iconColor && !danger ? { backgroundColor: `${iconColor}1f` } : undefined}
      >
        <Icon size={19} color={color} />
      </View>
      <View className={`flex-1 flex-row items-center gap-3 py-4 pr-4 ${last ? '' : `border-b ${t.border}`}`}>
        <View className="flex-1">
          <Text className={`text-[15px] font-semibold ${danger ? 'text-red-500' : t.text}`}>{label}</Text>
          {hint ? <Text className={`text-[12.5px] mt-0.5 ${t.muted}`}>{hint}</Text> : null}
        </View>
        {badge ? (
          <View className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent items-center justify-center">
            <Text className="text-white text-[11px] font-bold">{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
        {right ?? (onPress && !danger ? <ChevronRight size={18} color={t.hex.muted} /> : null)}
      </View>
    </Pressable>
  );
}
