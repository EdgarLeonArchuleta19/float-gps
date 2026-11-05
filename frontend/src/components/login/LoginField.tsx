import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export default function LoginField({
  label,
  icon: Icon,
  right,
  ...props
}: TextInputProps & { label: string; icon: LucideIcon; right?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  const accent = '#f87203';
  return (
    <View className="gap-2">
      <Text className="text-[12.5px] font-semibold text-white/85">{label}</Text>
      <View
        className="flex-row items-center gap-3 rounded-xl px-4 h-14"
        style={{ borderWidth: 1.5, borderColor: focused ? accent : 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.08)' }}
      >
        <Icon size={18} color={focused ? accent : 'rgba(255,255,255,0.6)'} />
        <TextInput
          {...props}
          placeholderTextColor="rgba(255,255,255,0.45)"
          className="flex-1 h-full text-[15px] text-white"
          style={{ outlineStyle: 'none' } as any}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {right}
      </View>
    </View>
  );
}
