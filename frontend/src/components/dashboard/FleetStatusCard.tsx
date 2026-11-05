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
    <Card className="p-5">
      <View className="flex-row items-end justify-between mb-3">
        <View>
          <Text className={`text-[14px] font-medium ${t.muted}`}>Tu flota</Text>
          <Text className={`text-[34px] font-extrabold tracking-tight ${t.text}`}>
            {total} <Text className={`text-[14px] font-medium ${t.muted}`}>unidades</Text>
          </Text>
        </View>
        <View className="items-end">
          <View className={`rounded-full px-3 py-1 ${t.selected}`}>
            <Text className="text-[14px] font-extrabold" style={{ color: t.hex.onSelected }}>{working}%</Text>
          </View>
          <Text className={`text-[12px] mt-1 ${t.muted}`}>trabajó hoy</Text>
        </View>
      </View>
      <View className={`flex-row h-2 rounded-full overflow-hidden mb-4 gap-0.5 ${t.tonal}`}>
        {total > 0 ? parts.map((p) => (p.value > 0 ? <View key={p.key} className="rounded-full" style={{ flex: p.value, backgroundColor: markerColor(p.key) }} /> : null)) : null}
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
