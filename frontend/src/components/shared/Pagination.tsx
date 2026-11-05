import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTheme();
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const button = (label: string, target: number, disabled: boolean, icon: 'prev' | 'next') => (
    <Pressable
      onPress={() => onChange(target)}
      disabled={disabled}
      accessibilityLabel={label}
      className={`flex-row items-center gap-1 rounded-full px-3.5 h-10 ${t.card} ${disabled ? 'opacity-40' : t.press}`}
    >
      {icon === 'prev' ? <ChevronLeft size={16} color={t.hex.brand} /> : null}
      <Text className={`text-[13px] font-bold ${t.brandText}`}>{label}</Text>
      {icon === 'next' ? <ChevronRight size={16} color={t.hex.brand} /> : null}
    </Pressable>
  );
  return (
    <View className="flex-row items-center justify-between mt-4">
      {button('Anterior', page - 1, page <= 1, 'prev')}
      <View className="items-center">
        <Text className={`text-[12.5px] font-semibold ${t.text}`}>
          Página {page} de {totalPages}
        </Text>
        <Text className={`text-[11px] ${t.subtle}`}>
          {from}–{to} de {total}
        </Text>
      </View>
      {button('Siguiente', page + 1, page >= totalPages, 'next')}
    </View>
  );
}
