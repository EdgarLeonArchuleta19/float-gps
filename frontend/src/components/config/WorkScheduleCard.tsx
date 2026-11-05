import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Copy, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { api, type DaySchedule, type WorkSchedule } from '@/lib/api';
import { Button, Card, Loading } from '@/components/ui';
import Toggle from '@/components/shared/Toggle';

const STEP = 30;
const DAY_END = 24 * 60;

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const WEEKDAYS = [1, 2, 3, 4, 5];

const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

function TimeStepper({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled: boolean }) {
  const { t } = useTheme();
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  return (
    <View className="flex-1 gap-1">
      <Text className={`text-[12px] ml-1 ${t.muted}`}>{label}</Text>
      <View className={`flex-row items-center justify-between rounded-full p-1 ${t.input}`} pointerEvents={disabled ? 'none' : 'auto'}>
        <Pressable onPress={() => step(-STEP)} disabled={value <= min} accessibilityLabel={`Restar media hora a ${label}`} className={`p-2 active:opacity-60 ${value <= min ? 'opacity-30' : ''}`}>
          <Minus size={15} color={t.hex.brand} />
        </Pressable>
        <Text className={`text-[15.5px] font-bold ${t.text}`}>{timeLabel(value)}</Text>
        <Pressable onPress={() => step(STEP)} disabled={value >= max} accessibilityLabel={`Sumar media hora a ${label}`} className={`p-2 active:opacity-60 ${value >= max ? 'opacity-30' : ''}`}>
          <Plus size={15} color={t.hex.brand} />
        </Pressable>
      </View>
    </View>
  );
}

export default function WorkScheduleCard({ editable }: { editable: boolean }) {
  const { t } = useTheme();
  const toast = useToast();
  const { data, loading } = useApi(() => api.company.schedule(), []);
  const [days, setDays] = useState<DaySchedule[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDays(data.days);
  }, [data]);

  if (loading || !days) return <Loading />;

  const find = (day: number) => days.find((d) => d.day === day);
  const lastUsed = days[days.length - 1];

  const toggleDay = (day: number, on: boolean) =>
    setDays((prev) => {
      if (!prev) return prev;
      if (!on) return prev.filter((d) => d.day !== day);
      const template = prev.find((d) => WEEKDAYS.includes(d.day)) || lastUsed || { start: 7 * 60, end: 19 * 60 };
      return [...prev, { day, start: template.start, end: template.end }];
    });

  const setTime = (day: number, field: 'start' | 'end', value: number) =>
    setDays((prev) => (prev ? prev.map((d) => (d.day === day ? { ...d, [field]: value } : d)) : prev));

  const monday = find(1);
  const copyMonday = () => {
    if (!monday) return;
    setDays((prev) => {
      if (!prev) return prev;
      const others = prev.filter((d) => !WEEKDAYS.includes(d.day));
      return [...others, ...WEEKDAYS.map((day) => ({ day, start: monday.start, end: monday.end }))];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved: WorkSchedule = await api.company.updateSchedule({ days });
      setDays(saved.days);
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
        Cada día puede tener su propio horario. Lo que se recorra fuera de él se cuenta como "km fuera de horario" en Inicio, el mapa y los reportes.
      </Text>
      {DAYS.map((d, i) => {
        const entry = find(d.value);
        return (
          <View key={d.value} className={`py-3 ${i < DAYS.length - 1 ? `border-b ${t.border}` : ''}`}>
            <View className="flex-row items-center gap-3">
              <Text className={`flex-1 text-[14.5px] font-semibold ${entry ? t.text : t.muted}`}>{d.label}</Text>
              {entry ? null : <Text className={`text-[12.5px] ${t.subtle}`}>Descanso</Text>}
              <Toggle value={!!entry} onChange={(on) => toggleDay(d.value, on)} disabled={!editable} label={`${d.label} es laboral`} />
            </View>
            {entry ? (
              <View className="flex-row gap-3 mt-2.5">
                <TimeStepper label="Entrada" value={entry.start} min={0} max={entry.end - STEP} onChange={(v) => setTime(d.value, 'start', v)} disabled={!editable} />
                <TimeStepper label="Salida" value={entry.end} min={entry.start + STEP} max={DAY_END} onChange={(v) => setTime(d.value, 'end', v)} disabled={!editable} />
              </View>
            ) : null}
          </View>
        );
      })}
      {editable ? (
        <View className="gap-3 mt-3">
          {monday ? (
            <Pressable onPress={copyMonday} className="flex-row items-center gap-1.5 self-start py-1">
              <Copy size={14} color={t.hex.brand} />
              <Text className={`text-[12.5px] font-bold ${t.brandText}`}>Usar el horario del lunes de lunes a viernes</Text>
            </Pressable>
          ) : null}
          <Button label="Guardar horario" onPress={save} loading={saving} disabled={!days.length} />
        </View>
      ) : (
        <Text className={`text-[11.5px] mt-3 ${t.subtle}`}>Solo un administrador puede cambiar el horario.</Text>
      )}
    </Card>
  );
}
