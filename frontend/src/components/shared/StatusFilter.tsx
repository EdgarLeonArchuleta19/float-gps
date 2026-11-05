import { Text, View } from 'react-native';
import { PowerOff } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import FilterSelect from './FilterSelect';

export type StatusView = 'active' | 'inactive';

export function InactiveBadge({ feminine }: { feminine?: boolean }) {
  const { t } = useTheme();
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${t.input}`}>
      <PowerOff size={10} color={t.hex.muted} />
      <Text className={`text-[10.5px] font-semibold ${t.muted}`}>{feminine ? 'Desactivada' : 'Desactivado'}</Text>
    </View>
  );
}

export default function StatusFilter({
  value,
  onChange,
  activeCount,
  inactiveCount,
  feminine,
}: {
  value: StatusView;
  onChange: (value: StatusView) => void;
  activeCount: number;
  inactiveCount: number;
  feminine?: boolean;
}) {
  const ending = feminine ? 'as' : 'os';
  return (
    <FilterSelect
      label="Estado"
      value={value}
      onChange={(v) => onChange(v as StatusView)}
      options={[
        { value: 'active', label: `Activ${ending}`, count: activeCount },
        { value: 'inactive', label: `Desactivad${ending}`, count: inactiveCount },
      ]}
    />
  );
}
