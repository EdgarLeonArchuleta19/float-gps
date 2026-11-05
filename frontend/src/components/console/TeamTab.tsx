import { Text, View } from 'react-native';
import { KeyRound, Pencil, Power, PowerOff, UsersRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDateTime } from '@/lib/format';
import { staffRoleLabel } from '@/lib/staff';
import { Card, EmptyState } from '@/components/ui';
import { ActionIcon } from '@/components/shared/LifecycleActions';
import type { TeamMember } from './consoleApi';

export default function TeamTab({
  members,
  selfId,
  onEdit,
  onResetPassword,
  onToggleActive,
}: {
  members: TeamMember[];
  selfId: string;
  onEdit: (m: TeamMember) => void;
  onResetPassword: (m: TeamMember) => void;
  onToggleActive: (m: TeamMember) => void;
}) {
  const { t } = useTheme();
  if (!members.length) {
    return (
      <Card>
        <EmptyState icon={UsersRound} title="Sin integrantes" />
      </Card>
    );
  }
  return (
    <Card className="py-1">
      {members.map((m, i) => {
        const self = m.id === selfId;
        return (
          <View key={m.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < members.length - 1 ? `border-b ${t.border}` : ''} ${m.isActive ? '' : 'opacity-60'}`}>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className={`text-[14.5px] font-bold flex-shrink ${t.text}`} numberOfLines={1}>
                  {m.name}
                  {self ? ' (tú)' : ''}
                </Text>
                <View className={`rounded-full px-2.5 py-0.5 ${t.selected}`}>
                  <Text className={`text-[11.5px] font-semibold ${t.brandText}`}>{staffRoleLabel(m.role)}</Text>
                </View>
                {!m.isActive ? <Text className="text-[11.5px] font-semibold text-red-500">Desactivado</Text> : null}
              </View>
              <Text className={`text-[12px] mt-0.5 ${t.muted}`} numberOfLines={1}>
                {m.email} · {m.lastLoginAt ? `Último acceso ${formatDateTime(m.lastLoginAt)}` : 'Nunca ha entrado'}
              </Text>
            </View>
            <View className="flex-row gap-1.5">
              <ActionIcon icon={Pencil} label={`Editar ${m.name}`} onPress={() => onEdit(m)} />
              {!self ? (
                <>
                  <ActionIcon icon={KeyRound} label={`Nueva contraseña para ${m.name}`} onPress={() => onResetPassword(m)} />
                  <ActionIcon icon={m.isActive ? PowerOff : Power} label={m.isActive ? `Desactivar a ${m.name}` : `Reactivar a ${m.name}`} onPress={() => onToggleActive(m)} color={m.isActive ? '#ef4444' : undefined} />
                </>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}
