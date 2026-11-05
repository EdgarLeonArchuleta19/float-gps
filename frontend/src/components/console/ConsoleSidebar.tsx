import { Pressable, ScrollView, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { ORANGE } from '@/lib/brand';
import { BrandMark } from '@/components/brand/Wordmark';
import AdminWordmark from './AdminWordmark';

export interface ConsoleNavItem<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  count?: number;
}

const WIDE = 252;
const NARROW = 68;
const ACTIVE_BG = 'rgba(248,114,3,0.12)';

export default function ConsoleSidebar<K extends string>({
  items,
  active,
  onSelect,
  compact,
  onExit,
}: {
  items: ConsoleNavItem<K>[];
  active: K;
  onSelect: (key: K) => void;
  compact: boolean;
  onExit: () => void;
}) {
  const { t } = useTheme();
  const hover = t.isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';
  return (
    <View style={{ width: compact ? NARROW : WIDE }} className={`h-full border-r ${t.card} ${t.border}`}>
      <View className={`justify-center ${compact ? 'items-center h-16' : 'px-5 h-16'}`}>{compact ? <BrandMark size={28} /> : <AdminWordmark size={17} />}</View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: compact ? 10 : 12, paddingTop: 8, gap: 4 }}>
        {items.map(({ key, label, icon: Icon, count }) => {
          const selected = key === active;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              className={`flex-row items-center rounded-xl ${compact ? 'justify-center h-12' : 'gap-3 px-3 h-11'} ${selected ? '' : hover}`}
              style={selected ? { backgroundColor: ACTIVE_BG } : undefined}
            >
              <Icon size={19} color={selected ? ORANGE : t.hex.muted} />
              {compact ? null : (
                <>
                  <Text className={`flex-1 text-[14px] ${selected ? 'font-bold' : `font-medium ${t.muted}`}`} style={selected ? { color: ORANGE } : undefined}>
                    {label}
                  </Text>
                  {count !== undefined ? <Text className={`text-[12px] ${selected ? '' : t.subtle}`} style={selected ? { color: ORANGE } : undefined}>{count}</Text> : null}
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View className={`border-t ${t.border} ${compact ? 'items-center py-3' : 'px-3 py-3'}`}>
        <Pressable onPress={onExit} accessibilityLabel="Salir" className={`flex-row items-center rounded-xl ${compact ? 'justify-center w-12 h-12' : 'gap-3 px-3 h-11'} ${hover}`}>
          <LogOut size={19} color={t.hex.muted} />
          {compact ? null : <Text className={`text-[14px] font-medium ${t.muted}`}>Salir</Text>}
        </Pressable>
      </View>
    </View>
  );
}
