import { Pressable, Text, View } from 'react-native';
import { Radio, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Card, EmptyState } from '@/components/ui';
import OptionPicker from './OptionPicker';
import type { OwnerCompany, OwnerGps } from './ownerApi';

export default function GpsTab({
  devices,
  companies,
  onAssign,
  onDelete,
}: {
  devices: OwnerGps[];
  companies: OwnerCompany[];
  onAssign: (gps: OwnerGps, companyId: string) => void;
  onDelete: (gps: OwnerGps) => void;
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
            <View className="flex-1 min-w-[180px]">
              <Text className={`text-[14px] font-semibold ${t.text}`}>{g.imei}</Text>
              <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                {g.model}
                {g.simNumber ? ` · SIM ${g.simNumber}` : ''}
              </Text>
              <Text className={`text-[11.5px] ${linked ? 'text-green-500' : t.subtle}`}>{linked ? `Vinculado a ${linked}` : 'Sin unidad vinculada'}</Text>
            </View>
            <View className="w-[200px]">
              <OptionPicker value={g.companyId || ''} options={options} onChange={(v) => onAssign(g, v)} compact />
            </View>
            <Pressable onPress={() => onDelete(g)} accessibilityLabel={`Eliminar GPS ${g.imei}`} className="p-2 active:opacity-60">
              <Trash2 size={17} color="#ef4444" />
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}
