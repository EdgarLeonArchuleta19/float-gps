import { useState } from 'react';
import { Text, View } from 'react-native';
import { ArchiveRestore, Boxes, Building2, CircleDot, Construction, Radio, ShieldCheck, Truck, UserRound, Wrench } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDateTime } from '@/lib/format';
import { Button, Card, EmptyState } from '@/components/ui';
import type { TrashItem, TrashType } from './consoleApi';

const TYPE_INFO: Record<TrashType, { label: string; icon: LucideIcon }> = {
  company: { label: 'Empresa', icon: Building2 },
  user: { label: 'Usuario', icon: UserRound },
  vehicle: { label: 'Vehículo', icon: Truck },
  machine: { label: 'Maquinaria', icon: Construction },
  geofence: { label: 'Geocerca', icon: CircleDot },
  role: { label: 'Rol', icon: ShieldCheck },
  gps: { label: 'GPS', icon: Radio },
  group: { label: 'Grupo', icon: Boxes },
  maintenance: { label: 'Mantenimiento', icon: Wrench },
};

export default function TrashTab({ items, onRestore }: { items: TrashItem[]; onRestore: (item: TrashItem) => Promise<void> }) {
  const { t } = useTheme();
  const [restoring, setRestoring] = useState<string | null>(null);

  if (!items.length) {
    return (
      <Card>
        <EmptyState icon={ArchiveRestore} title="No hay registros eliminados" message="Lo que las empresas borren aparecerá aquí para poder restaurarlo." />
      </Card>
    );
  }

  const restore = async (item: TrashItem) => {
    setRestoring(`${item.type}:${item.id}`);
    try {
      await onRestore(item);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Card className="py-1">
      {items.map((item, i) => {
        const info = TYPE_INFO[item.type];
        return (
          <View key={`${item.type}:${item.id}`} className={`flex-row items-center gap-3 px-4 py-3 ${i < items.length - 1 ? `border-b ${t.border}` : ''}`}>
            <View className={`w-9 h-9 rounded-xl items-center justify-center ${t.input}`}>
              <info.icon size={17} color={t.hex.muted} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
                {item.label}
              </Text>
              <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                {[info.label, item.detail, item.companyName].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text className={`text-[11px] ${t.subtle}`}>Eliminado {formatDateTime(item.deletedAt)}</Text>
            <Button
              label="Restaurar"
              icon={ArchiveRestore}
              variant="soft"
              compact
              onPress={() => restore(item)}
              loading={restoring === `${item.type}:${item.id}`}
            />
          </View>
        );
      })}
    </Card>
  );
}
