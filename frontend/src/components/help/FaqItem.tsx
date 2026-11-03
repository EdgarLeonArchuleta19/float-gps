import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function Faq({ q, a, last }: { q: string; a: string; last: boolean }) {
  const { t } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} className={`px-4 py-3.5 ${last ? '' : `border-b ${t.border}`}`}>
      <View className="flex-row items-center gap-3">
        <Text className={`flex-1 text-[14px] font-semibold ${t.text}`}>{q}</Text>
        {expanded ? <ChevronUp size={16} color={t.hex.muted} /> : <ChevronDown size={16} color={t.hex.muted} />}
      </View>
      {expanded ? <Text className={`text-[13px] mt-2 leading-5 ${t.muted}`}>{a}</Text> : null}
    </Pressable>
  );
}
