import { Text, View } from 'react-native';
import { Link2, Radio, Trash2, Unlink } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button, Card, EmptyState } from '@/components/ui';
import { ActionIcon } from '@/components/shared/LifecycleActions';
import OptionPicker from './OptionPicker';
import type { ConsoleCompany, ConsoleGps } from './consoleApi';

export default function GpsTab({
  devices,
  companies,
  onAssign,
  onLink,
  onUnlink,
  onDelete,
}: {
  devices: ConsoleGps[];
  companies: ConsoleCompany[];
  onAssign: (gps: ConsoleGps, companyId: string) => void;
  onLink: (gps: ConsoleGps) => void;
  onUnlink: (gps: ConsoleGps) => void;
  onDelete: (gps: ConsoleGps) => void;
}) {
  const { t } = useTheme();
  if (!devices.length) {
    return (
      <Card>
        <EmptyState icon={Radio} title="Inventario vacío" message="Registra el primer equipo GPS." />
      </Card>
    );
  }
  const options = [{ value: '', label: 'Stock libre' }, ...companies.map((c) => ({ value: c.id, label: c.name }))];
  return (
    <Card className="py-1">
      {devices.map((g, i) => {
        const linked = g.vehicle ? `${g.vehicle.name}${g.vehicle.plate ? ` · ${g.vehicle.plate}` : ''}` : g.machine?.name;
        return (
          <View key={g.id} className={`flex-row flex-wrap items-center gap-3 px-4 py-3 ${i < devices.length - 1 ? `border-b ${t.border}` : ''}`}>
            <View className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
              <Radio size={18} color={linked ? '#16a34a' : t.hex.muted} />
            </View>
            <View className="flex-1 min-w-[200px]">
              <Text className={`text-[14px] font-semibold ${t.text}`}>{g.imei}</Text>
              <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                {g.model}
                {g.simNumber ? ` · SIM ${g.simNumber}` : ''}
              </Text>
              <Text className={`text-[12px] font-semibold ${linked ? 'text-green-600' : t.subtle}`}>{linked ? `En ${linked}` : 'Sin unidad'}</Text>
            </View>
            <View className="w-[200px]">
              {linked ? (
                <Text className={`text-[13px] ${t.text}`} numberOfLines={1}>
                  {g.company?.name}
                </Text>
              ) : (
                <OptionPicker value={g.companyId || ''} options={options} onChange={(v) => onAssign(g, v)} compact />
              )}
            </View>
            {linked ? (
              <Button label="Desvincular" icon={Unlink} variant="soft" compact onPress={() => onUnlink(g)} />
            ) : (
              <Button variant="accent" label="Vincular" icon={Link2} compact onPress={() => onLink(g)} disabled={!g.companyId} />
            )}
            <ActionIcon icon={Trash2} label={`Eliminar GPS ${g.imei}`} onPress={() => onDelete(g)} color="#ef4444" />
          </View>
        );
      })}
    </Card>
  );
}
