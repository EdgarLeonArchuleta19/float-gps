import { useState } from 'react';
import { Pressable, type TextInputProps } from 'react-native';
import { Eye, EyeOff, KeyRound, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Field } from '@/components/ui';

export default function PasswordField({ label, icon = KeyRound, ...props }: Omit<TextInputProps, 'secureTextEntry'> & { label: string; icon?: LucideIcon }) {
  const { t } = useTheme();
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;
  return (
    <Field
      label={label}
      icon={icon}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      right={
        <Pressable onPress={() => setVisible((v) => !v)} accessibilityLabel={visible ? 'Ocultar contraseña' : 'Ver contraseña'} hitSlop={10} className="p-1">
          <Toggle size={18} color={t.hex.muted} />
        </Pressable>
      }
    />
  );
}
