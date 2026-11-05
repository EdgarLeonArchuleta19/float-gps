import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Lock, Save } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { PLAN_LABELS } from '@/lib/plans';
import { toDateInput } from '@/lib/format';
import { Button, Field, Sheet } from '@/components/ui';
import OptionPicker from './OptionPicker';
import { SUBSCRIPTION_STATUS, formatMoney } from './SubscriptionsTab';
import { consoleApi, type BillingCycle, type SubscriptionInput, type SubscriptionRow, type SubscriptionStatus } from './consoleApi';

const STATUSES = (Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]).map((value) => ({ value, label: SUBSCRIPTION_STATUS[value].label }));

const CYCLES = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'YEARLY', label: 'Anual' },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function initialForm(row: SubscriptionRow): SubscriptionInput {
  const sub = row.subscription;
  return {
    maxUnits: row.company.maxUnits,
    status: sub?.status || 'ACTIVE',
    billingCycle: sub?.billingCycle || 'MONTHLY',
    pricePerUnit: sub?.pricePerUnit || 0,
    nextBillingAt: sub?.nextBillingAt ? toDateInput(new Date(sub.nextBillingAt)) : '',
    notes: sub?.notes || '',
  };
}

export default function SubscriptionSheet({ row, onClose, onSaved }: { row: SubscriptionRow | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState<SubscriptionInput | null>(null);
  const [price, setPrice] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    const next = initialForm(row);
    setForm(next);
    setPrice(next.pricePerUnit ? String(next.pricePerUnit) : '');
    setConfirmPassword('');
  }, [row]);

  if (!row || !form) return null;

  const set = <K extends keyof SubscriptionInput>(key: K, value: SubscriptionInput[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const dateOk = !form.nextBillingAt || DATE_PATTERN.test(form.nextBillingAt);
  const amount = (Number(price) || 0) * form.maxUnits;
  const blocking = form.status === 'SUSPENDED' || form.status === 'CANCELLED';

  const save = async () => {
    if (!dateOk || form.maxUnits < 1 || !confirmPassword) return;
    setSaving(true);
    try {
      await consoleApi.saveSubscription(row.company.id, {
        ...form,
        pricePerUnit: Number(price) || 0,
        nextBillingAt: form.nextBillingAt ? new Date(`${form.nextBillingAt}T12:00:00`).toISOString() : null,
      }, confirmPassword);
      toast(`Suscripción de ${row.company.name} guardada`, 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message || 'No se pudo guardar la suscripción', 'error');
      setConfirmPassword('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={`Suscripción · ${row.company.name}`}>
      <View className="gap-3 pb-2">
        <View className={`rounded-xl px-3.5 py-3 ${t.input}`}>
          <Text className={`text-[12.5px] ${t.muted}`}>Plan {PLAN_LABELS[row.company.plan]} · el plan se cambia desde la ficha del cliente, con motivo.</Text>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Unidades contratadas" value={String(form.maxUnits)} onChangeText={(v) => set('maxUnits', Number(v.replace(/[^0-9]/g, '')) || 0)} keyboardType="number-pad" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <OptionPicker label="Estado" value={form.status} options={STATUSES} onChange={(v) => set('status', v as SubscriptionStatus)} />
          </View>
          <View className="flex-1">
            <OptionPicker label="Ciclo de cobro" value={form.billingCycle} options={CYCLES} onChange={(v) => set('billingCycle', v as BillingCycle)} />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Precio por unidad (MXN)" placeholder="0" value={price} onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          </View>
          <View className="flex-1">
            <Field label="Próximo cobro" placeholder="AAAA-MM-DD" value={form.nextBillingAt || ''} onChangeText={(v) => set('nextBillingAt', v.trim())} />
          </View>
        </View>
        <View className={`rounded-xl p-3.5 ${t.input}`}>
          <Text className={`text-[12.5px] ${t.muted}`}>Total por {form.billingCycle === 'YEARLY' ? 'año' : 'mes'}</Text>
          <Text className={`text-[20px] font-extrabold ${t.text}`}>{formatMoney(amount)}</Text>
        </View>
        {row.units > form.maxUnits ? (
          <Text className="text-[12.5px] text-amber-600">La empresa ya tiene {row.units} unidades; no podrá dar de alta más hasta que subas el límite.</Text>
        ) : null}
        {blocking ? <Text className="text-[12.5px] text-red-500">Al guardar como {SUBSCRIPTION_STATUS[form.status].label.toLowerCase()} se suspende el acceso de la empresa.</Text> : null}
        {!dateOk ? <Text className="text-[12.5px] text-red-500">Escribe la fecha como AAAA-MM-DD.</Text> : null}
        <Field label="Notas" placeholder="Forma de pago, contacto de cobranza…" value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} />
        <Field icon={Lock} label="Tu contraseña" placeholder="Confirma con tu contraseña" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        <Button variant="accent" label="Guardar suscripción" icon={Save} onPress={save} loading={saving} disabled={!dateOk || form.maxUnits < 1 || !confirmPassword} />
      </View>
    </Sheet>
  );
}
