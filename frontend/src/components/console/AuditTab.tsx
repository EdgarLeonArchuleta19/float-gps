import { Text, View } from 'react-native';
import { CheckCircle2, ScrollText, XCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDateTime } from '@/lib/format';
import { Card, EmptyState, Loading } from '@/components/ui';
import { staffRoleLabel } from '@/lib/staff';
import { auditLabel } from './auditLabels';
import type { AuditLog } from './consoleApi';

export default function AuditTab({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  const { t } = useTheme();
  if (loading && !logs.length) return <Loading label="Cargando bitácora…" />;
  if (!logs.length) {
    return (
      <Card>
        <EmptyState icon={ScrollText} title="Bitácora vacía" />
      </Card>
    );
  }
  return (
    <Card className="py-1">
      {logs.map((log, i) => (
        <View key={log.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < logs.length - 1 ? `border-b ${t.border}` : ''}`}>
          {log.success ? <CheckCircle2 size={17} color="#22c55e" /> : <XCircle size={17} color="#ef4444" />}
          <View className="flex-1 min-w-0">
            <Text className={`text-[13.5px] font-semibold ${t.text}`} numberOfLines={1}>
              {auditLabel(log.action)}
            </Text>
            <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
              {log.actorEmail || 'Desconocido'}
              {log.actorRole ? ` · ${staffRoleLabel(log.actorRole)}` : ''} · IP {log.ip || '—'}
            </Text>
            {log.action === 'SUPPORT_CHANGE' && log.details ? (
              <Text className={`text-[11.5px] ${t.subtle}`} numberOfLines={1}>
                {String(log.details.method)} {String(log.details.path)}
              </Text>
            ) : null}
          </View>
          <Text className={`text-[11.5px] ${t.subtle}`}>{formatDateTime(log.createdAt)}</Text>
        </View>
      ))}
    </Card>
  );
}
