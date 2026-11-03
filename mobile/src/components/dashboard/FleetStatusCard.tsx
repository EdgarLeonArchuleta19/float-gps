import { Text, View } from 'react-native';
import { markerColor } from '@/lib/format';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui';
import StatusTile from './StatusTile';

export default function FleetStatusCard({
  total,
  moving,
  stopped,
  offline,
  alert,
  working,
}: {
  total: number;
  moving: number;
  stopped: number;
  offline: number;
  alert: number;
  working: number;
}) {
  const { t } = useTheme();
  const parts = [
    { key: 'MOVING', value: moving },
    { key: 'STOPPED', value: stopped },
    { key: 'ALERT', value: alert },
    { key: 'OFFLINE', value: offline },
  ];
  return (
    <Card className="p-4">
      <View className="flex-row items-end justify-between mb-3">
        <View>
          <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>Flota</Text>
          <Text className={`text-[28px] font-bold ${t.text}`}>
            {total} <Text className={`text-[14px] font-medium ${t.muted}`}>unidades</Text>
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[20px] font-bold" style={{ color: t.hex.primary }}>{working}%</Text>
          <Text className={`text-[11px] ${t.muted}`}>trabajó hoy</Text>
        </View>
      </View>
      <View className={`flex-row h-2.5 rounded-full overflow-hidden mb-3 ${t.input}`}>
        {total > 0 ? parts.map((p) => (p.value > 0 ? <View key={p.key} style={{ flex: p.value, backgroundColor: markerColor(p.key) }} /> : null)) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        <StatusTile status="MOVING" label="En movimiento" value={moving} />
        <StatusTile status="STOPPED" label="Detenidas" value={stopped} />
        <StatusTile status="OFFLINE" label="Apagadas" value={offline} />
        <StatusTile status="ALERT" label="Alerta" value={alert} />
      </View>
    </Card>
  );
}
