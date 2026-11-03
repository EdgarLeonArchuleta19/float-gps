import { Text, View } from 'react-native';
import { Building2, LifeBuoy, PauseCircle, PlayCircle, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button, Card, EmptyState } from '@/components/ui';
import type { OwnerCompany } from './ownerApi';

function Count({ label, value }: { label: string; value: string | number }) {
  const { t } = useTheme();
  return (
    <View className={`flex-1 rounded-xl p-2.5 ${t.input}`}>
      <Text className={`text-[15px] font-bold ${t.text}`}>{value}</Text>
      <Text className={`text-[10.5px] ${t.subtle}`}>{label}</Text>
    </View>
  );
}

export default function CompaniesTab({
  companies,
  onSupport,
  onToggle,
  onDelete,
}: {
  companies: OwnerCompany[];
  onSupport: (c: OwnerCompany) => void;
  onToggle: (c: OwnerCompany) => void;
  onDelete: (c: OwnerCompany) => void;
}) {
  const { t } = useTheme();
  if (!companies.length) {
    return (
      <Card>
        <EmptyState icon={Building2} title="Sin empresas" message="Crea la primera empresa cliente." />
      </Card>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-3">
      {companies.map((c) => {
        const units = (c._count?.vehicles || 0) + (c._count?.machines || 0);
        return (
          <Card key={c.id} className="p-4 flex-1 min-w-[300px]">
            <View className="flex-row items-start justify-between gap-2 mb-1">
              <Text className={`text-[16px] font-bold flex-1 ${t.text}`} numberOfLines={1}>
                {c.name}
              </Text>
              <View className={`rounded-full px-2.5 py-1 ${c.isActive ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                <Text className={`text-[11px] font-semibold ${c.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {c.isActive ? 'Activa' : 'Suspendida'}
                </Text>
              </View>
            </View>
            <Text className={`text-[12px] mb-3 ${t.muted}`} numberOfLines={1}>
              Plan {c.plan || '—'} · {c.contactEmail || 'Sin correo'}
              {c.contactPhone ? ` · ${c.contactPhone}` : ''}
            </Text>
            <View className="flex-row gap-2 mb-3">
              <Count label="Unidades" value={`${units}/${c.maxUnits ?? '∞'}`} />
              <Count label="GPS" value={c._count?.gpsDevices || 0} />
              <Count label="Usuarios" value={c._count?.users || 0} />
              <Count label="Geocercas" value={c._count?.geofences || 0} />
            </View>
            <View className="flex-row gap-2">
              <Button label="Soporte" icon={LifeBuoy} compact onPress={() => onSupport(c)} disabled={!c.isActive} className="flex-1" />
              <Button
                label={c.isActive ? 'Suspender' : 'Reactivar'}
                icon={c.isActive ? PauseCircle : PlayCircle}
                variant="secondary"
                compact
                onPress={() => onToggle(c)}
                className="flex-1"
              />
              <Button label="Eliminar" icon={Trash2} variant="ghost" compact onPress={() => onDelete(c)} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}
