import { Text, View } from 'react-native';
import { openUnit } from '@/lib/units';
import type { LucideIcon } from 'lucide-react-native';
import { BatteryMedium, Clock, Crosshair, History, Navigation, Power, Route, Share2, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatHours, markerColor, shortTimeAgo } from '@/lib/format';
import { METRICS } from '@/components/reports/metrics';
import type { FleetUnit } from '@/lib/types';
import { kmToday } from '@/lib/units';
import { StatusPill } from '@/components/ui';
import Tappable from '@/components/shared/Tappable';
import { UnitIcon } from '@/components/shared/VehicleIcon';
import { NAVY } from '@/lib/brand';

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) {
  const { t } = useTheme();
  return (
    <View className="w-[33.33%] p-1">
      <View className={`rounded-2xl px-3 py-2.5 ${tone ? '' : t.tonal}`} style={tone ? { backgroundColor: `${tone}${t.isDark ? '26' : '14'}` } : undefined}>
        <View className="flex-row items-center gap-1">
          <Icon size={12} color={tone || t.hex.muted} />
          <Text className="text-[11px] font-medium" style={{ color: tone || t.hex.muted }} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text className={`text-[15px] font-extrabold mt-1 ${t.text}`} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Action({
  icon: Icon,
  label,
  onPress,
  active,
  danger,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  loading?: boolean;
}) {
  const { t } = useTheme();
  const fill = active ? NAVY : danger ? '#ef44441a' : t.hex.tonal;
  const iconColor = active ? '#ffffff' : danger ? '#ef4444' : t.hex.brand;
  return (
    <Tappable onPress={onPress} disabled={loading} haptic scaleTo={0.9} className="w-[33.33%] items-center gap-2 py-2">
      <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: fill }}>
        <Icon size={22} color={iconColor} />
      </View>
      <Text className={`text-[12px] font-semibold text-center ${t.text}`} numberOfLines={1}>
        {loading ? 'Cargando…' : label}
      </Text>
    </Tappable>
  );
}

export default function UnitQuickPanel({
  unit,
  following,
  routeShown,
  routeLoading,
  onClose,
  onFollow,
  onRoute,
  onHistory,
  onNavigate,
  navigateLoading,
  onShare,
  onEngine,
  offHoursKm,
}: {
  unit: FleetUnit;
  offHoursKm?: number;
  following: boolean;
  routeShown: boolean;
  routeLoading: boolean;
  onClose: () => void;
  onFollow: () => void;
  onRoute: () => void;
  onHistory: () => void;
  onNavigate: () => void;
  navigateLoading?: boolean;
  onShare?: () => void;
  onEngine?: () => void;
}) {
  const { t } = useTheme();
  const p = unit.position;
  const voltage = p?.voltage;
  const lowBattery = voltage !== undefined && voltage !== null && voltage < 11.5;
  const color = markerColor(unit.status);

  return (
    <View className="px-5 pb-4">
      <View className="flex-row items-center gap-3 mb-4">
        <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: `${color}1f` }}>
          <UnitIcon unit={unit} size={34} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className={`text-[20px] font-extrabold tracking-tight ${t.text}`} numberOfLines={1}>
            {unit.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1 flex-wrap">
            <Text className={`text-[13px] ${t.muted}`}>{unit.plate}</Text>
            <StatusPill status={unit.status} />
          </View>
        </View>
        <Tappable onPress={onClose} accessibilityLabel="Cerrar" className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
          <X size={18} color={t.hex.muted} />
        </Tappable>
      </View>

      {p ? (
        <View className="flex-row items-center gap-1.5 mb-3 ml-1">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: p.ignition ? '#22c55e' : t.hex.muted }} />
          <Text className="text-[12.5px] font-semibold" style={{ color: p.ignition ? '#22c55e' : t.hex.muted }}>
            {p.ignition ? 'Motor encendido' : 'Motor apagado'}
          </Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap -m-1 mb-4">
        <Metric icon={METRICS.km.icon} label="Recorrido hoy" value={`${kmToday(unit).toFixed(1)} km`} />
        <Metric icon={METRICS.hours.icon} label="Motor hoy" value={formatHours(unit.todaySession?.totalHours ?? 0)} />
        <Metric icon={METRICS.idle.icon} label="Ralentí hoy" value={formatHours(unit.todaySession?.idleHours ?? 0)} />
        {offHoursKm !== undefined ? <Metric icon={METRICS.offHours.icon} label="Fuera horario" value={`${offHoursKm.toFixed(1)} km`} /> : null}
        <Metric icon={BatteryMedium} label="Batería" value={voltage ? `${voltage.toFixed(1)} V` : '—'} tone={lowBattery ? '#ef4444' : undefined} />
        <Metric icon={Clock} label="Reporte" value={p ? shortTimeAgo(p.timestamp) : '—'} />
      </View>

      <View className="flex-row flex-wrap mb-4">
        <Action icon={Crosshair} label={following ? 'Siguiendo' : 'Seguir'} onPress={onFollow} active={following} />
        <Action icon={Route} label="Ruta de hoy" onPress={onRoute} active={routeShown} loading={routeLoading} />
        <Action icon={History} label="Historial" onPress={onHistory} />
        <Action icon={Navigation} label="Cómo llegar" onPress={onNavigate} loading={navigateLoading} />
        {onShare ? <Action icon={Share2} label="Compartir" onPress={onShare} /> : null}
        {onEngine ? <Action icon={Power} label="Motor" onPress={onEngine} danger /> : null}
      </View>

      <Tappable onPress={() => openUnit(unit)} haptic className="flex-row items-center justify-center gap-1 rounded-full h-[52px] bg-navy">
        <Text className="text-[14.5px] font-bold text-white">Ver detalle completo</Text>
        <ChevronRight size={17} color="#ffffff" />
      </Tappable>
    </View>
  );
}
