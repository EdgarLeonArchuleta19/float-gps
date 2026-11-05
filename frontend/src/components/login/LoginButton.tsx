import { ActivityIndicator, Text } from 'react-native';
import Tappable from '@/components/shared/Tappable';
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
    <Tappable
      onPress={onPress}
      haptic
      disabled={inactive}
      accessibilityRole="button"
      className={`h-14 rounded-full flex-row items-center justify-center gap-2 ${inactive ? 'opacity-50' : ''}`}
      style={{ backgroundColor: '#f87203' }}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : null}
      <Text className="text-white text-[15.5px] font-semibold">{loading ? loadingLabel || label : label}</Text>
      {!loading ? <ArrowRight size={18} color="#ffffff" /> : null}
    </Tappable>
  );
}
