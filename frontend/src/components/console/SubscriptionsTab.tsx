import { Text, View } from 'react-native';
import { CalendarClock, Pencil, Receipt } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/plans';
import Tappable from '@/components/shared/Tappable';
import { Card, EmptyState } from '@/components/ui';
import type { SubscriptionRow, SubscriptionStatus } from './consoleApi';

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; color: string }> = {
  TRIAL: { label: 'Prueba', color: '#2563eb' },
  ACTIVE: { label: 'Activa', color: '#16a34a' },
  PAST_DUE: { label: 'Pago vencido', color: '#d97706' },
  SUSPENDED: { label: 'Suspendida', color: '#dc2626' },
  CANCELLED: { label: 'Cancelada', color: '#6b7280' },
};

export function formatMoney(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function StatusBadge({ status }: { status: SubscriptionStatus | null }) {
  const { t } = useTheme();
  if (!status) {
    return (
      <View className={`rounded-full px-2.5 py-1 ${t.tonal}`}>
        <Text className={`text-[11.5px] font-semibold ${t.muted}`}>Sin suscripción</Text>
      </View>
    );
  }
  const { label, color } = SUBSCRIPTION_STATUS[status];
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}1f` }}>
      <Text className="text-[11.5px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export default function SubscriptionsTab({ rows, onEdit }: { rows: SubscriptionRow[]; onEdit: (row: SubscriptionRow) => void }) {
  const { t } = useTheme();
  if (!rows.length) {
    return (
      <Card>
        <EmptyState icon={Receipt} title="Sin empresas" message="Crea una empresa para registrar su suscripción." />
      </Card>
    );
  }
  return (
    <Card className="py-1">
      {rows.map((row, i) => {
        const sub = row.subscription;
        const overdue = !!sub?.nextBillingAt && new Date(sub.nextBillingAt).getTime() < Date.now();
        return (
          <Tappable
            key={row.company.id}
            onPress={() => onEdit(row)}
            accessibilityLabel={`Editar suscripción de ${row.company.name}`}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${i < rows.length - 1 ? `border-b ${t.border}` : ''}`}
          >
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className={`text-[14.5px] font-bold flex-shrink ${t.text}`} numberOfLines={1}>
                  {row.company.name}
                </Text>
                <StatusBadge status={sub?.status || null} />
              </View>
              <Text className={`text-[12.5px] mt-0.5 ${t.muted}`} numberOfLines={1}>
                Plan {PLAN_LABELS[row.company.plan]} · {row.units} de {row.company.maxUnits} unidades
                {sub ? ` · ${formatMoney(sub.pricePerUnit, sub.currency)} por unidad ${sub.billingCycle === 'YEARLY' ? 'al año' : 'al mes'}` : ''}
              </Text>
            </View>
            {sub?.nextBillingAt ? (
              <View className="items-end">
                <View className="flex-row items-center gap-1">
                  <CalendarClock size={13} color={overdue ? '#d97706' : t.hex.muted} />
                  <Text className={`text-[12px] font-semibold ${overdue ? 'text-amber-600' : t.muted}`}>{formatDate(sub.nextBillingAt)}</Text>
                </View>
                <Text className={`text-[13px] font-extrabold mt-0.5 ${t.text}`}>{formatMoney(row.monthlyAmount, sub.currency)}/mes</Text>
              </View>
            ) : null}
            <Pencil size={16} color={t.hex.brand} />
          </Tappable>
        );
      })}
    </Card>
  );
}
