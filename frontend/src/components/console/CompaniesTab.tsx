import { Pressable, Text, View } from 'react-native';
import { ArrowLeftRight, Building2, FileText, LifeBuoy, PauseCircle, PlayCircle, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button, Card, EmptyState } from '@/components/ui';
import type { ConsoleCompany } from './consoleApi';
import type { CustomerSection } from './CustomerSheet';
import { PLAN_LABELS, normalizePlan } from '@/lib/plans';

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
  onOpen,
  canSupport,
  canBill,
  canDelete,
}: {
  companies: ConsoleCompany[];
  canSupport: boolean;
  canBill: boolean;
  canDelete: boolean;
  onOpen: (c: ConsoleCompany, section: CustomerSection) => void;
  onSupport: (c: ConsoleCompany) => void;
  onToggle: (c: ConsoleCompany) => void;
  onDelete: (c: ConsoleCompany) => void;
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
        const plan = normalizePlan(c.plan);
        return (
          <Card key={c.id} className="p-4 flex-1 min-w-[300px]">
            <View className="flex-row items-start justify-between gap-2 mb-1">
              <Pressable onPress={() => onOpen(c, 'data')} accessibilityLabel={`Ver ficha de ${c.name}`} className="flex-1">
                <Text className={`text-[16px] font-bold ${t.text}`} numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
              <View className={`rounded-full px-2.5 py-1 ${c.isActive ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                <Text className={`text-[11px] font-semibold ${c.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {c.isActive ? 'Activa' : 'Suspendida'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2 mb-3">
              <Pressable
                onPress={() => onOpen(c, 'plan')}
                disabled={!canBill}
                accessibilityLabel={`Cambiar plan de ${c.name}`}
                className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${plan === 'PERSONAL' ? 'bg-accent/15' : t.selected}`}
              >
                <Text className={`text-[11.5px] font-bold ${plan === 'PERSONAL' ? 'text-accent' : t.brandText}`}>Plan {PLAN_LABELS[plan]}</Text>
                {canBill ? <ArrowLeftRight size={12} color={plan === 'PERSONAL' ? '#f87203' : t.hex.brand} /> : null}
              </Pressable>
              <Text className={`flex-1 text-[12px] ${t.muted}`} numberOfLines={1}>
                {c.contactEmail || 'Sin correo'}
                {c.contactPhone ? ` · ${c.contactPhone}` : ''}
              </Text>
            </View>
            <View className="flex-row gap-2 mb-3">
              <Count label="Unidades" value={`${units}/${c.maxUnits ?? '∞'}`} />
              <Count label="GPS" value={c._count?.gpsDevices || 0} />
              <Count label="Usuarios" value={c._count?.users || 0} />
              <Count label="Geocercas" value={c._count?.geofences || 0} />
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Button label="Ficha" icon={FileText} variant="tonal" compact onPress={() => onOpen(c, 'data')} />
              {canSupport ? <Button variant="accent" label="Soporte" icon={LifeBuoy} compact onPress={() => onSupport(c)} disabled={!c.isActive} /> : null}
              {canBill ? (
                <Button
                  label={c.isActive ? 'Suspender' : 'Reactivar'}
                  icon={c.isActive ? PauseCircle : PlayCircle}
                  variant="soft"
                  compact
                  onPress={() => onToggle(c)}
                />
              ) : null}
              {canDelete ? <Button label="Eliminar" icon={Trash2} variant="dangerSoft" compact onPress={() => onDelete(c)} /> : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}
