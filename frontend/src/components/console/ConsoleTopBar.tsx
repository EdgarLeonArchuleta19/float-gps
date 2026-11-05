import { Pressable, Text, View } from 'react-native';
import { Moon, ShieldOff, Sun } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { ORANGE } from '@/lib/brand';
import { staffRoleLabel, type StaffMember } from '@/lib/staff';
import Tappable from '@/components/shared/Tappable';

function TopIcon({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Tappable onPress={onPress} accessibilityLabel={label} accessibilityRole="button" className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
      <Icon size={18} color={t.hex.text} />
    </Tappable>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function ConsoleTopBar({
  title,
  staff,
  compact,
  onAccount,
  onRevoke,
}: {
  title: string;
  staff: StaffMember;
  compact: boolean;
  onAccount: () => void;
  onRevoke: () => void;
}) {
  const { t, toggle } = useTheme();
  return (
    <View className={`flex-row items-center justify-between h-16 border-b ${compact ? 'px-4' : 'px-6'} ${t.card} ${t.border}`}>
      {compact ? (
        <View />
      ) : (
        <Text className={`text-[15px] font-semibold ${t.muted}`} numberOfLines={1}>
          {title}
        </Text>
      )}
      <View className="flex-row items-center gap-2">
        <TopIcon icon={t.isDark ? Sun : Moon} label="Cambiar tema" onPress={toggle} />
        <TopIcon icon={ShieldOff} label="Cerrar todas mis sesiones" onPress={onRevoke} />
        <Pressable onPress={onAccount} accessibilityLabel="Mi cuenta" className={`flex-row items-center gap-2.5 rounded-full pl-1 ${compact ? 'pr-1' : 'pr-3.5'} py-1 ${t.tonal}`}>
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: ORANGE }}>
            <Text className="text-white text-[13px] font-bold">{initials(staff.name)}</Text>
          </View>
          {compact ? null : (
            <View>
              <Text className={`text-[13px] font-semibold ${t.text}`} numberOfLines={1}>
                {staff.name}
              </Text>
              <Text className={`text-[11.5px] ${t.muted}`}>{staffRoleLabel(staff.role)}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
