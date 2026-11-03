import { Pressable, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { eventTypeLabel, shortTimeAgo } from '@/lib/format';
import type { TrackingEvent } from '@/lib/types';
import { Card } from '@/components/ui';
import { eventUnitName } from '@/components/events/EventRow';

export interface AttentionItem {
  key: string;
  title: string;
  detail: string;
  onPress: () => void;
}

export function attentionFromEvent(e: TrackingEvent, onPress: () => void): AttentionItem {
  return {
    key: e.id,
    title: `${eventTypeLabel(e.type)} · ${eventUnitName(e)}`,
    detail: `hace ${shortTimeAgo(e.timestamp)}${e.speed ? ` · ${Math.round(e.speed)} km/h` : ''}`,
    onPress,
  };
}

export default function AttentionList({ items }: { items: AttentionItem[] }) {
  const { t } = useTheme();
  if (!items.length) {
    return (
      <Card className="p-4 flex-row items-center gap-3">
        <CheckCircle2 size={22} color={t.hex.primary} />
        <View className="flex-1">
          <Text className={`text-[14px] font-semibold ${t.text}`}>Todo en orden</Text>
          <Text className={`text-[12px] ${t.muted}`}>No hay unidades ni alertas que requieran tu atención.</Text>
        </View>
      </Card>
    );
  }
  return (
    <Card className="py-1">
      {items.map((item, i) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          className={`flex-row items-center gap-3 px-4 py-3 ${i < items.length - 1 ? `border-b ${t.border}` : ''} active:opacity-70`}
        >
          <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: '#f872031f' }}>
            <AlertTriangle size={17} color="#f87203" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className={`text-[13.5px] font-semibold ${t.text}`} numberOfLines={1}>
              {item.title}
            </Text>
            <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
              {item.detail}
            </Text>
          </View>
          <ChevronRight size={16} color={t.hex.muted} />
        </Pressable>
      ))}
    </Card>
  );
}
