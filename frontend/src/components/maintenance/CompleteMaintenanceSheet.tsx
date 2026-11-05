import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate, toDateInput } from '@/lib/format';
import type { Maintenance } from '@/lib/types';
import { Button, ErrorBanner, Field, Sheet, Skeleton } from '@/components/ui';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export default function CompleteMaintenanceSheet({ item, onClose, onSaved }: { item: Maintenance | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [doneAt, setDoneAt] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const history = useApi(() => (item ? api.maintenance.history(item.id) : Promise.resolve([])), [item?.id]);

  useEffect(() => {
    if (!item) return;
    setDoneAt(toDateInput(new Date()));
    setCost('');
    setNotes('');
    setError('');
  }, [item]);

  const dateOk = DATE_PATTERN.test(doneAt);

  const save = async () => {
    if (!item || !dateOk) return;
    setSaving(true);
    setError('');
    try {
      await api.maintenance.complete(item.id, { doneAt: new Date(`${doneAt}T12:00:00`).toISOString(), cost: Number(cost) || null, notes: notes.trim() });
      toast(`${item.title} registrado. El contador empieza de nuevo.`, 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const logs = history.data || [];

  return (
    <Sheet visible={!!item} onClose={onClose} title={item ? `${item.title} hecho` : undefined}>
      <View className="gap-3 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        <Text className={`text-[13px] ${t.muted}`}>{item ? `${item.vehicle?.name || item.machine?.name} · ${Math.round(item.kmSince).toLocaleString('es-MX')} km desde el anterior` : ''}</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Fecha" placeholder="AAAA-MM-DD" value={doneAt} onChangeText={(v) => setDoneAt(v.trim())} />
          </View>
          <View className="flex-1">
            <Field label="Costo (opcional)" placeholder="0" value={cost} onChangeText={(v) => setCost(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          </View>
        </View>
        <Field label="Notas" placeholder="Taller, factura, observaciones" value={notes} onChangeText={setNotes} multiline maxLength={500} />
        <Button label="Registrar" icon={CheckCircle2} onPress={save} loading={saving} disabled={!dateOk} />
        <Text className={`text-[16px] font-bold mt-2 ${t.text}`}>Historial</Text>
        {history.loading && !history.data ? (
          <Skeleton className="h-12 rounded-xl" />
        ) : !logs.length ? (
          <Text className={`text-[13px] ${t.muted}`}>Aún no hay registros.</Text>
        ) : (
          logs.map((log, i) => (
            <View key={log.id} className={`py-2.5 ${i < logs.length - 1 ? `border-b ${t.border}` : ''}`}>
              <View className="flex-row justify-between">
                <Text className={`text-[13.5px] font-semibold ${t.text}`}>{formatDate(log.doneAt)}</Text>
                {log.cost ? <Text className={`text-[13.5px] font-bold ${t.text}`}>{money(log.cost)}</Text> : null}
              </View>
              <Text className={`text-[12px] ${t.muted}`}>
                {log.km !== null ? `${Math.round(log.km).toLocaleString('es-MX')} km · ` : ''}
                {log.doneBy}
                {log.notes ? ` · ${log.notes}` : ''}
              </Text>
            </View>
          ))
        )}
      </View>
    </Sheet>
  );
}
