import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Wrench } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { Card, SectionTitle } from '@/components/ui';
import { maintenanceSummary } from '@/components/maintenance/MaintenanceCard';
import { MAINTENANCE_STATUS, maintenanceKind } from '@/components/maintenance/maintenanceKinds';

const VISIBLE = 3;

export default function UnitMaintenance({ unitId }: { unitId: string }) {
  const { t } = useTheme();
  const { data } = useApi(() => api.maintenance.list({ unitId }), [unitId]);
  const items = (data || []).slice(0, VISIBLE);
  const open = () => router.push(`/maintenance?unit=${unitId}` as never);

  return (
    <View>
      <SectionTitle
        right={
          <Pressable onPress={open} hitSlop={8}>
            <Text className={`text-[13px] font-bold ${t.brandText}`}>{items.length ? 'Ver todo' : 'Agregar'}</Text>
          </Pressable>
        }
      >
        Mantenimiento
      </SectionTitle>
      <Card className="py-1">
        {!items.length ? (
          <Pressable onPress={open} className="flex-row items-center gap-3 px-4 py-3.5">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
              <Wrench size={18} color={t.hex.brand} />
            </View>
            <Text className={`flex-1 text-[13.5px] ${t.muted}`}>Agrega recordatorios de aceite, llantas, seguro o verificación.</Text>
          </Pressable>
        ) : (
          items.map((m, i) => {
            const status = MAINTENANCE_STATUS[m.status];
            const Icon = maintenanceKind(m.kind).icon;
            return (
              <Pressable key={m.id} onPress={open} className={`flex-row items-center gap-3 px-4 py-3 ${i < items.length - 1 ? `border-b ${t.border}` : ''}`}>
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${status.color}1f` }}>
                  <Icon size={17} color={status.color} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
                    {m.title}
                  </Text>
                  <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                    {maintenanceSummary(m)}
                  </Text>
                </View>
                <Text className="text-[12px] font-bold" style={{ color: status.color }}>
                  {status.label}
                </Text>
              </Pressable>
            );
          })
        )}
      </Card>
    </View>
  );
}
