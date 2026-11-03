import { useState } from 'react';
import { Text, View } from 'react-native';
import { BellRing, ChevronRight } from 'lucide-react-native';
import { useAlarm } from '@/context/AlarmContext';
import { useTheme } from '@/context/ThemeContext';
import { useFleet } from '@/hooks/useFleet';
import { Card } from '@/components/ui';
import AlarmSheet from '@/components/shared/AlarmSheet';

export default function AlarmCard() {
  const { t } = useTheme();
  const alarm = useAlarm();
  const { units } = useFleet();
  const [open, setOpen] = useState(false);
  const color = alarm.active ? '#ef4444' : t.hex.muted;
  return (
    <>
      <Card onPress={() => setOpen(true)} className="p-4 mb-4 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}1f` }}>
          <BellRing size={19} color={color} />
        </View>
        <View className="flex-1">
          <Text className={`text-[14px] font-semibold ${t.text}`}>Modo alarma</Text>
          <Text className={`text-[12px] ${t.muted}`}>
            {alarm.active ? `Activa en ${alarm.unitIds.length} unidades` : 'Desactivada · toca para configurar'}
          </Text>
        </View>
        <ChevronRight size={16} color={t.hex.muted} />
      </Card>
      <AlarmSheet visible={open} units={units} onClose={() => setOpen(false)} />
    </>
  );
}
