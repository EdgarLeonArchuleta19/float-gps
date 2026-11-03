import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { BatteryLow, CircleDot, Gauge, ShieldAlert, Siren, Volume2 } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAlarm } from '@/context/AlarmContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import type { FleetUnit } from '@/lib/types';
import { Button, Sheet } from '@/components/ui';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';

const WATCHES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: CircleDot, title: 'Geocercas', desc: 'Entradas y salidas de zonas' },
  { icon: Gauge, title: 'Exceso de velocidad', desc: 'Cuando superen el límite configurado' },
  { icon: BatteryLow, title: 'Batería baja', desc: 'Cuando el equipo tenga poca carga' },
  { icon: Siren, title: 'Encendido y SOS', desc: 'Motor encendido o botón de pánico' },
];

export default function AlarmSheet({ visible, units, onClose }: { visible: boolean; units: FleetUnit[]; onClose: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const alarm = useAlarm();
  const [active, setActive] = useState(alarm.active);
  const [guard, setGuard] = useState(alarm.guard);
  const [selected, setSelected] = useState<string[]>(alarm.unitIds);

  useEffect(() => {
    if (!visible) return;
    setActive(alarm.active);
    setGuard(alarm.guard);
    setSelected(alarm.unitIds);
  }, [visible]);

  const save = () => {
    if (active && !selected.length) {
      toast('Selecciona al menos una unidad', 'error');
      return;
    }
    alarm.save({ active, guard: active && guard, unitIds: selected });
    toast(
      active ? `${guard ? 'Modo guarda' : 'Alarma'} activo en ${selected.length} unidades` : 'Alarma desactivada',
      active ? 'success' : 'info'
    );
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Modo alarma">
      <View className={`flex-row items-center justify-between rounded-2xl p-4 mb-3 ${t.card} border ${t.border}`}>
        <View className="flex-1 pr-3">
          <Text className={`text-[14px] font-semibold ${t.text}`}>{active ? 'Alarma activada' : 'Alarma desactivada'}</Text>
          <Text className={`text-[12px] ${t.muted}`}>Te avisamos con un aviso en pantalla y vibración mientras la app esté abierta.</Text>
        </View>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: '#f87203', false: t.hex.border }} thumbColor="#ffffff" />
      </View>
      {active ? (
        <View className="rounded-2xl p-4 mb-3 border" style={{ borderColor: guard ? '#ef4444' : t.hex.border, backgroundColor: guard ? '#ef444414' : t.hex.card }}>
          <View className="flex-row items-center gap-3">
            <ShieldAlert size={20} color={guard ? '#ef4444' : t.hex.muted} />
            <View className="flex-1 pr-2">
              <Text className={`text-[14px] font-semibold ${t.text}`}>Modo guarda</Text>
              <Text className={`text-[12px] ${t.muted}`}>Suena una sirena fuerte aunque el celular esté en silencio, hasta que la detengas.</Text>
            </View>
            <Switch value={guard} onValueChange={setGuard} trackColor={{ true: '#ef4444', false: t.hex.border }} thumbColor="#ffffff" />
          </View>
          {guard ? (
            <View className="mt-3">
              <Button label="Probar sonido" icon={Volume2} variant="secondary" compact onPress={alarm.testGuard} />
            </View>
          ) : null}
        </View>
      ) : null}
      <View className="gap-2 mb-3">
        {WATCHES.map((w) => (
          <View key={w.title} className="flex-row items-center gap-3 px-1">
            <w.icon size={16} color={t.hex.primary} />
            <View className="flex-1">
              <Text className={`text-[13px] font-semibold ${t.text}`}>{w.title}</Text>
              <Text className={`text-[11.5px] ${t.muted}`}>{w.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      {active ? <UnitMultiSelect units={units} selected={selected} onChange={setSelected} /> : null}
      <Button label="Guardar" onPress={save} className="mt-3 mb-2" />
    </Sheet>
  );
}
