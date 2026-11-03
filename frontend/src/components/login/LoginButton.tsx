import { ActivityIndicator, Pressable, Text } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

export default function LoginButton({
  label,
  loadingLabel,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  loadingLabel?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`h-14 rounded-2xl flex-row items-center justify-center gap-2 ${inactive ? 'opacity-50' : 'active:opacity-80'}`}
      style={{ backgroundColor: '#f87203' }}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : null}
      <Text className="text-white text-[15.5px] font-semibold">{loading ? loadingLabel || label : label}</Text>
      {!loading ? <ArrowRight size={18} color="#ffffff" /> : null}
    </Pressable>
  );
}
