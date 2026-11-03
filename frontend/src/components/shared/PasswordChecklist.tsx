import { Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { passwordRules } from '@/lib/passwordPolicy';

export default function PasswordChecklist({ password }: { password: string }) {
  const { t } = useTheme();
  return (
    <View className={`rounded-xl p-3 gap-1.5 ${t.input}`}>
      {passwordRules(password).map((rule) => (
        <View key={rule.label} className="flex-row items-center gap-2">
          {rule.ok ? <Check size={14} color="#22c55e" strokeWidth={3} /> : <X size={14} color={t.hex.muted} />}
          <Text className={`text-[12px] ${rule.ok ? 'text-green-500' : t.muted}`}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}
