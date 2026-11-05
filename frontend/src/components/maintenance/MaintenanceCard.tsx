import { Text, View } from 'react-native';
import { CheckCircle2, Pencil } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/format';
import type { Maintenance } from '@/lib/types';
import { Button, Card } from '@/components/ui';
import { ActionIcon } from '@/components/shared/LifecycleActions';
import { InactiveBadge } from '@/components/shared/StatusFilter';
import { MAINTENANCE_STATUS, maintenanceKind } from './maintenanceKinds';

function share(done: number, total: number) {
  return Math.max(0, Math.min(1, total > 0 ? done / total : 0));
}

function Progress({ value, color }: { value: number; color: string }) {
  const { t } = useTheme();
  return (
    <View className={`h-2 rounded-full overflow-hidden ${t.tonal}`}>
      <View className="h-2 rounded-full" style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }} />
    </View>
  );
}

export function maintenanceSummary(m: Maintenance) {
  const parts: string[] = [];
  if (m.intervalKm) parts.push(m.kmLeft !== null && m.kmLeft > 0 ? `faltan ${Math.round(m.kmLeft).toLocaleString('es-MX')} km` : `pasado por ${Math.round(-(m.kmLeft || 0)).toLocaleString('es-MX')} km`);
  if (m.dueAt && m.daysLeft !== null) parts.push(m.daysLeft > 0 ? `faltan ${m.daysLeft} días (${formatDate(m.dueAt)})` : `venció el ${formatDate(m.dueAt)}`);
  return parts.join(' · ');
}

export default function MaintenanceCard({
  item,
  showUnit = true,
  onComplete,
  onEdit,
}: {
  item: Maintenance;
  showUnit?: boolean;
  onComplete: (m: Maintenance) => void;
  onEdit: (m: Maintenance) => void;
}) {
  const { t } = useTheme();
  const kind = maintenanceKind(item.kind);
  const status = MAINTENANCE_STATUS[item.status];
  const Icon = kind.icon;
  const unitName = item.vehicle?.name || item.machine?.name || 'Unidad';
  const kmShare = item.intervalKm ? share(item.kmSince, item.intervalKm) : 0;
  const dayShare = item.intervalDays && item.daysLeft !== null ? share(item.intervalDays - item.daysLeft, item.intervalDays) : 0;

  return (
    <Card className="p-4 gap-3">
      <View className="flex-row items-start gap-3">
        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: `${status.color}1f` }}>
          <Icon size={19} color={status.color} />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className={`text-[15px] font-bold flex-shrink ${t.text}`} numberOfLines={1}>
              {item.title}
            </Text>
            <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: `${status.color}1f` }}>
              <Text className="text-[11.5px] font-bold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
            {item.isActive ? null : <InactiveBadge />}
          </View>
          <Text className={`text-[12.5px] mt-0.5 ${t.muted}`} numberOfLines={2}>
            {showUnit ? `${unitName} · ` : ''}
            {maintenanceSummary(item)}
          </Text>
        </View>
        <ActionIcon icon={Pencil} label={`Editar ${item.title}`} onPress={() => onEdit(item)} />
      </View>
      {item.intervalKm ? (
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-[11.5px] ${t.muted}`}>{Math.round(item.kmSince).toLocaleString('es-MX')} km recorridos</Text>
            <Text className={`text-[11.5px] ${t.muted}`}>cada {item.intervalKm.toLocaleString('es-MX')} km</Text>
          </View>
          <Progress value={kmShare} color={status.color} />
        </View>
      ) : null}
      {item.intervalDays ? (
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-[11.5px] ${t.muted}`}>Último: {formatDate(item.lastDoneAt)}</Text>
            <Text className={`text-[11.5px] ${t.muted}`}>cada {item.intervalDays} días</Text>
          </View>
          <Progress value={dayShare} color={status.color} />
        </View>
      ) : null}
      {item.isActive ? <Button label="Marcar como hecho" icon={CheckCircle2} variant={item.status === 'OK' ? 'tonal' : 'primary'} compact onPress={() => onComplete(item)} /> : null}
    </Card>
  );
}
