import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { api, type WorkSchedule } from '@/lib/api';
import { Button, Card, Loading } from '@/components/ui';

const DAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'M' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
];

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

function HourStepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const { t } = useTheme();
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  return (
    <View className="flex-1 gap-1.5">
      <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>{label}</Text>
      <View className={`flex-row items-center justify-between rounded-xl border px-2 py-1.5 ${t.input} ${t.border}`}>
        <Pressable onPress={() => step(-1)} accessibilityLabel={`Restar una hora a ${label}`} className="p-2 active:opacity-60">
          <Minus size={16} color={t.hex.text} />
        </Pressable>
        <Text className={`text-[17px] font-bold ${t.text}`}>{hourLabel(value)}</Text>
        <Pressable onPress={() => step(1)} accessibilityLabel={`Sumar una hora a ${label}`} className="p-2 active:opacity-60">
          <Plus size={16} color={t.hex.text} />
        </Pressable>
      </View>
    </View>
  );
}

export default function WorkScheduleCard({ editable }: { editable: boolean }) {
  const { t } = useTheme();
  const toast = useToast();
  const { data, loading } = useApi(() => api.company.schedule(), []);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setSchedule(data);
  }, [data]);

  if (loading || !schedule) return <Loading />;

  const accent = t.isDark ? '#f87203' : '#032347';
  const toggleDay = (d: number) =>
    setSchedule((s) => (s ? { ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d] } : s));

  const save = async () => {
    setSaving(true);
    try {
      setSchedule(await api.company.updateSchedule(schedule));
      toast('Horario laboral actualizado', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <Text className={`text-[12.5px] mb-3 ${t.muted}`}>
        Lo que se recorra fuera de este horario se cuenta como "km fuera de horario" en Inicio, el mapa y los reportes.
      </Text>
      <View className="flex-row gap-3 mb-3" pointerEvents={editable ? 'auto' : 'none'}>
        <HourStepper label="Entrada" value={schedule.startHour} min={0} max={schedule.endHour - 1} onChange={(v) => setSchedule({ ...schedule, startHour: v })} />
        <HourStepper label="Salida" value={schedule.endHour} min={schedule.startHour + 1} max={24} onChange={(v) => setSchedule({ ...schedule, endHour: v })} />
      </View>
      <Text className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${t.subtle}`}>Días laborales</Text>
      <View className="flex-row justify-between mb-4" pointerEvents={editable ? 'auto' : 'none'}>
        {DAYS.map((d) => {
          const on = schedule.days.includes(d.value);
          return (
            <Pressable
              key={d.value}
              onPress={() => toggleDay(d.value)}
              className="w-10 h-10 rounded-full items-center justify-center border"
              style={{ backgroundColor: on ? accent : 'transparent', borderColor: on ? accent : t.hex.border }}
            >
              <Text className="text-[13px] font-bold" style={{ color: on ? '#ffffff' : t.hex.muted }}>
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {editable ? (
        <Button label="Guardar horario" onPress={save} loading={saving} disabled={!schedule.days.length} />
      ) : (
        <Text className={`text-[11.5px] ${t.subtle}`}>Solo un administrador puede cambiar el horario.</Text>
      )}
    </Card>
  );
}
