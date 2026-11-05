import type React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Construction, Car } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { shortTimeAgo } from '@/lib/format';
import { kmToday, openUnit } from '@/lib/units';
import type { FleetUnit } from '@/lib/types';
import { Card, StatusPill } from '@/components/ui';

export default function FleetTable({ units, actions }: { units: FleetUnit[]; actions?: (unit: FleetUnit) => React.ReactNode }) {
  const { t } = useTheme();
  const head = `text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`;
  return (
    <Card>
      <View className={`flex-row px-4 py-3 border-b ${t.border}`}>
        <Text className={`${head} flex-[3]`}>Unidad</Text>
        <Text className={`${head} flex-[2]`}>Tipo</Text>
        <Text className={`${head} flex-[2]`}>Estado</Text>
        <Text className={`${head} flex-1 text-right`}>Km hoy</Text>
        <Text className={`${head} flex-[2] text-right`}>Último reporte</Text>
        <Text className={`${head} flex-[2] text-right`}>GPS</Text>
        {actions ? <Text className={`${head} w-[124px] text-right`}>Acciones</Text> : null}
      </View>
      {units.map((u, i) => (
        <Pressable
          key={u.id}
          onPress={() => openUnit(u)}
          className={`flex-row items-center px-4 py-3 ${i < units.length - 1 ? `border-b ${t.border}` : ''} ${t.press}`}
        >
          <View className="flex-[3] flex-row items-center gap-3">
            {u.kind === 'machine' ? <Construction size={16} color={t.hex.muted} /> : <Car size={16} color={t.hex.muted} />}
            <View>
              <Text className={`text-[13px] font-semibold ${t.text}`}>{u.name}</Text>
              <Text className={`text-[11px] ${t.muted}`}>{u.plate}</Text>
            </View>
          </View>
          <Text className={`flex-[2] text-[13px] ${t.text}`}>{[u.type, u.brand].filter(Boolean).join(' · ')}</Text>
          <View className="flex-[2] items-start">
            <StatusPill status={u.status} />
          </View>
          <Text className={`flex-1 text-[13px] text-right ${t.text}`}>{kmToday(u).toFixed(1)} km</Text>
          <Text className={`flex-[2] text-[13px] text-right ${t.muted}`}>
            {u.position ? `hace ${shortTimeAgo(u.position.timestamp)}` : 'Sin reporte'}
          </Text>
          <Text className={`flex-[2] text-[12px] text-right ${t.muted}`}>{u.gpsDevice?.imei || 'Sin GPS'}</Text>
          {actions ? <View className="w-[124px] flex-row justify-end gap-1.5">{actions(u)}</View> : null}
        </Pressable>
      ))}
    </Card>
  );
}
