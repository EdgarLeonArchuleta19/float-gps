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
        <View className={`w-11 h-11 rounded-full items-center justify-center ${t.selected}`}>
          <CheckCircle2 size={22} color={t.hex.onSelected} />
        </View>
        <View className="flex-1">
          <Text className={`text-[14px] font-semibold ${t.text}`}>Todo en orden</Text>
          <Text className={`text-[12px] ${t.muted}`}>No hay unidades ni alertas que requieran tu atención.</Text>
        </View>
      </Card>
    );
  }
  return (
    <Card className="py-1.5 overflow-hidden">
      {items.map((item, i) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          className={`flex-row items-center gap-3 px-4 py-3.5 ${t.press}`}
        >
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: '#f872031f' }}>
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
