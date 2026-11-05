import { Text, View } from 'react-native';
import { LifeBuoy } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Card, Skeleton } from '@/components/ui';

const VISIBLE = 5;

export default function SupportAccessCard() {
  const { t } = useTheme();
  const { data, loading } = useApi(() => api.company.supportAccess(), []);
  const rows = (data || []).slice(0, VISIBLE);

  return (
    <Card className="px-5 py-4">
      <Text className={`text-[13px] mb-3 ${t.muted}`}>Cada vez que alguien del equipo de floaGPS entra a tu cuenta para darte soporte, queda aquí con su motivo.</Text>
      {loading && !data ? (
        <Skeleton className="h-12 rounded-xl" />
      ) : !rows.length ? (
        <Text className={`text-[14px] ${t.text}`}>Nadie del equipo de floaGPS ha entrado a tu cuenta.</Text>
      ) : (
        rows.map((row, i) => {
          const open = !row.endedAt && new Date(row.expiresAt).getTime() > Date.now();
          return (
            <View key={row.id} className={`flex-row gap-3 py-3 ${i < rows.length - 1 ? `border-b ${t.border}` : ''}`}>
              <View className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
                <LifeBuoy size={18} color={t.hex.brand} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={2}>
                  {row.reason}
                </Text>
                <Text className={`text-[12.5px] mt-0.5 ${t.muted}`}>
                  {row.staff.name} · {formatDateTime(row.startedAt)}
                  {open ? ' · en curso' : ''}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}
