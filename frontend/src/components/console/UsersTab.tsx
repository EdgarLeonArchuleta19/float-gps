import { Text, View } from 'react-native';
import { ActionIcon } from '@/components/shared/LifecycleActions';
import { KeyRound, Trash2, Users } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/format';
import { Card, EmptyState } from '@/components/ui';
import type { CustomerUser } from './consoleApi';


export default function UsersTab({
  users,
  onReset,
  onDelete,
}: {
  users: CustomerUser[];
  onReset: (u: CustomerUser) => void;
  onDelete: (u: CustomerUser) => void;
}) {
  const { t } = useTheme();
  if (!users.length) {
    return (
      <Card>
        <EmptyState icon={Users} title="Sin usuarios" />
      </Card>
    );
  }
  return (
    <Card className="py-1">
      {users.map((u, i) => (
        <View key={u.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < users.length - 1 ? `border-b ${t.border}` : ''}`}>
          <View className="flex-1 min-w-0">
            <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
              {u.name}
            </Text>
            <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
              {u.email} · {u.company?.name || 'Sin empresa'}
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <Text className={`text-[12px] font-semibold ${t.text}`}>{u.role === 'admin' ? 'Administrador' : u.customRole?.name || 'Usuario'}</Text>
            <Text className={`text-[11px] ${t.subtle}`}>{formatDate(u.createdAt)}</Text>
          </View>
          <View className="flex-row gap-1.5">
            <ActionIcon icon={KeyRound} label={`Restablecer contraseña de ${u.name}`} onPress={() => onReset(u)} color={t.hex.brand} />
            <ActionIcon icon={Trash2} label={`Eliminar ${u.name}`} onPress={() => onDelete(u)} color="#ef4444" />
          </View>
        </View>
      ))}
    </Card>
  );
}
