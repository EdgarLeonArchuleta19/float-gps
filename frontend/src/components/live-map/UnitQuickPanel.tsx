import { Pressable, Text, View } from 'react-native';
import { openUnit } from '@/lib/units';
import type { LucideIcon } from 'lucide-react-native';
import { BatteryMedium, Clock, Crosshair, History, Navigation, Power, Route, Share2, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatHours, shortTimeAgo } from '@/lib/format';
import { METRICS } from '@/components/reports/metrics';
import type { FleetUnit } from '@/lib/types';
import { kmToday } from '@/lib/units';
import { StatusPill } from '@/components/ui';

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) {
  const { t } = useTheme();
  return (
    <View className="w-[33.33%] p-1">
      <View className="rounded-xl px-2.5 py-2" style={{ backgroundColor: tone ? `${tone}${t.isDark ? '26' : '14'}` : t.hex.input }}>
        <View className="flex-row items-center gap-1">
          <Icon size={12} color={tone || t.hex.muted} />
          <Text className="text-[10px] font-semibold" style={{ color: tone || t.hex.muted }} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text className={`text-[14px] font-bold mt-0.5 ${t.text}`} numberOfLines={1}>
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
  const accent = danger ? '#ef4444' : t.isDark ? '#f87203' : '#032347';
  return (
    <Pressable onPress={onPress} disabled={loading} className="w-[33.33%] items-center gap-1.5 py-1.5 active:opacity-70">
      <View
        className={`w-12 h-12 rounded-2xl items-center justify-center border ${active ? '' : `${t.input} ${t.border}`}`}
        style={active ? { backgroundColor: accent, borderColor: accent } : undefined}
      >
        <Icon size={22} color={active ? '#ffffff' : accent} />
      </View>
      <Text className={`text-[11px] font-semibold text-center ${t.text}`} numberOfLines={1}>
        {loading ? 'Cargando…' : label}
      </Text>
    </Pressable>
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
  onShare,
  onEngine,
  offHoursKm,
}: {
  unit: FleetUnit;
  offHoursKm: number;
  following: boolean;
  routeShown: boolean;
  routeLoading: boolean;
  onClose: () => void;
  onFollow: () => void;
  onRoute: () => void;
  onHistory: () => void;
  onNavigate: () => void;
  onShare?: () => void;
  onEngine?: () => void;
}) {
  const { t } = useTheme();
  const p = unit.position;
  const voltage = p?.voltage;
  const lowBattery = voltage !== undefined && voltage !== null && voltage < 11.5;

  return (
    <View className="px-4 pb-4">
      <View className="flex-row items-start gap-3 mb-3">
        <View className="flex-1 min-w-0">
          <Text className={`text-[18px] font-bold ${t.text}`} numberOfLines={1}>
            {unit.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className={`text-[12px] ${t.muted}`}>{unit.plate}</Text>
            <StatusPill status={unit.status} />
            {p ? (
              <View className="flex-row items-center gap-1">
                <Power size={12} color={p.ignition ? '#22c55e' : t.hex.muted} />
                <Text className="text-[11px] font-semibold" style={{ color: p.ignition ? '#22c55e' : t.hex.muted }}>
                  {p.ignition ? 'Motor encendido' : 'Motor apagado'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Cerrar" className={`w-9 h-9 rounded-full items-center justify-center ${t.input}`}>
          <X size={18} color={t.hex.muted} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap -m-1 mb-3">
        <Metric icon={METRICS.km.icon} label="Recorrido hoy" value={`${kmToday(unit).toFixed(1)} km`} />
        <Metric icon={METRICS.hours.icon} label="Motor hoy" value={formatHours(unit.todaySession?.totalHours ?? 0)} />
        <Metric icon={METRICS.idle.icon} label="Ralentí hoy" value={formatHours(unit.todaySession?.idleHours ?? 0)} />
        <Metric icon={METRICS.offHours.icon} label="Fuera horario" value={`${offHoursKm.toFixed(1)} km`} />
        <Metric icon={BatteryMedium} label="Batería" value={voltage ? `${voltage.toFixed(1)} V` : '—'} tone={lowBattery ? '#ef4444' : undefined} />
        <Metric icon={Clock} label="Reporte" value={p ? shortTimeAgo(p.timestamp) : '—'} />
      </View>

      <View className="flex-row flex-wrap mb-3">
        <Action icon={Crosshair} label={following ? 'Siguiendo' : 'Seguir'} onPress={onFollow} active={following} />
        <Action icon={Route} label="Ruta de hoy" onPress={onRoute} active={routeShown} loading={routeLoading} />
        <Action icon={History} label="Historial" onPress={onHistory} />
        <Action icon={Navigation} label="Cómo llegar" onPress={onNavigate} />
        {onShare ? <Action icon={Share2} label="Compartir" onPress={onShare} /> : null}
        {onEngine ? <Action icon={Power} label="Motor" onPress={onEngine} danger /> : null}
      </View>

      <Pressable
        onPress={() => openUnit(unit)}
        className={`flex-row items-center justify-center gap-1 rounded-xl py-3 border ${t.border} active:opacity-70`}
      >
        <Text className={`text-[13px] font-semibold ${t.text}`}>Ver detalle completo</Text>
        <ChevronRight size={16} color={t.hex.muted} />
      </Pressable>
    </View>
  );
}
