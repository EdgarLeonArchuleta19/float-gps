import { Pressable, Text, View } from 'react-native';
import { KeyRound, Trash2, Users } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/format';
import { Card, EmptyState } from '@/components/ui';
import type { OwnerUser } from './ownerApi';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Dueño',
  admin: 'Administrador',
};

export default function UsersTab({
  users,
  onReset,
  onDelete,
}: {
  users: OwnerUser[];
  onReset: (u: OwnerUser) => void;
  onDelete: (u: OwnerUser) => void;
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
            <Text className={`text-[12px] font-semibold ${t.text}`}>{ROLE_LABELS[u.role] || u.customRole?.name || 'Usuario'}</Text>
            <Text className={`text-[11px] ${t.subtle}`}>{formatDate(u.createdAt)}</Text>
          </View>
          {u.role !== 'superadmin' ? (
            <>
              <Pressable onPress={() => onReset(u)} accessibilityLabel={`Restablecer contraseña de ${u.name}`} className="p-2 active:opacity-60">
                <KeyRound size={17} color={t.hex.primary} />
              </Pressable>
              <Pressable onPress={() => onDelete(u)} accessibilityLabel={`Eliminar ${u.name}`} className="p-2 active:opacity-60">
                <Trash2 size={17} color="#ef4444" />
              </Pressable>
            </>
          ) : null}
        </View>
      ))}
    </Card>
  );
}
