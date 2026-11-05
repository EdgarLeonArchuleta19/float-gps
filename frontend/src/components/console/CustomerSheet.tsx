import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeftRight, CheckCircle2, Lock, Save, XCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useApi } from '@/hooks/useApi';
import { DEFAULT_MAX_UNITS, PLAN_LABELS } from '@/lib/plans';
import { formatDateTime } from '@/lib/format';
import { staffRoleLabel } from '@/lib/staff';
import type { Plan } from '@/lib/types';
import ScopeOption from '@/components/shared/ScopeOption';
import { Button, Chip, ChipRow, ErrorBanner, Field, Loading, Sheet } from '@/components/ui';
import { auditLabel } from './auditLabels';
import { consoleApi, type AuditLog, type CustomerDetail, type CustomerInput } from './consoleApi';

export type CustomerSection = 'data' | 'plan' | 'history';

const SECTIONS: { key: CustomerSection; label: string }[] = [
  { key: 'data', label: 'Datos' },
  { key: 'plan', label: 'Plan' },
  { key: 'history', label: 'Movimientos' },
];

const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

function toInput(c: CustomerDetail): CustomerInput {
  return {
    name: c.name,
    legalName: c.legalName || '',
    taxId: c.taxId || '',
    contactEmail: c.contactEmail || '',
    contactPhone: c.contactPhone || '',
    address: c.address || '',
    website: c.website || '',
    notes: c.notes || '',
  };
}

function movementDetail(log: AuditLog) {
  const d = log.details || {};
  if (log.action === 'COMPANY_PLAN_CHANGE') {
    const from = PLAN_LABELS[d.from as Plan] || d.from;
    const to = PLAN_LABELS[d.to as Plan] || d.to;
    return `${from} → ${to} · ${d.maxUnitsFrom} → ${d.maxUnitsTo} unidades · Motivo: ${d.reason}`;
  }
  if (log.action === 'SUPPORT_MODE_ENTER' && d.reason) return `Motivo: ${d.reason}`;
  if (log.action === 'SUPPORT_CHANGE') return `${d.method} ${d.path}`;
  return null;
}

function DataForm({ customer, onSaved }: { customer: CustomerDetail; onSaved: (c: CustomerDetail) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<CustomerInput>(toInput(customer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const business = customer.plan === 'EMPRESA';
  const set = <K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => setForm(toInput(customer)), [customer]);

  const rfcOk = !form.taxId.trim() ? !business : RFC_PATTERN.test(form.taxId.trim().toUpperCase());
  const changed = JSON.stringify(form) !== JSON.stringify(toInput(customer));

  const save = async () => {
    const ok = await confirm({ title: 'Guardar cambios', message: `Se actualizarán los datos de "${customer.name}". El cambio queda registrado en sus movimientos.`, confirmLabel: 'Guardar', icon: Save });
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      const updated = await consoleApi.updateCompany(customer.id, { ...form, taxId: form.taxId.trim().toUpperCase() });
      toast('Datos del cliente actualizados', 'success');
      onSaved(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-3">
      {error ? <ErrorBanner message={error} /> : null}
      <Field label={business ? 'Nombre comercial' : 'Nombre completo'} value={form.name} onChangeText={(v) => set('name', v)} maxLength={80} />
      {business ? (
        <>
          <Field label="Razón social" value={form.legalName} onChangeText={(v) => set('legalName', v)} maxLength={120} />
          <Field label="RFC" value={form.taxId} onChangeText={(v) => set('taxId', v.toUpperCase())} autoCapitalize="characters" maxLength={13} />
          {!rfcOk ? <Text className="text-[12px] text-red-500 ml-1">El RFC debe tener 12 o 13 caracteres válidos.</Text> : null}
        </>
      ) : null}
      <Field label="Correo" value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Teléfono" value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="phone-pad" />
      <Field label={business ? 'Dirección fiscal' : 'Dirección (opcional)'} value={form.address} onChangeText={(v) => set('address', v)} multiline maxLength={250} />
      {business ? <Field label="Sitio web (opcional)" value={form.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" /> : null}
      <Field label="Notas internas" value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} />
      <Button variant="accent" label="Guardar cambios" icon={Save} onPress={save} loading={saving} disabled={!changed || !rfcOk || form.name.trim().length < 2} />
    </View>
  );
}

function PlanForm({ customer, units, onSaved }: { customer: CustomerDetail; units: number; onSaved: (c: CustomerDetail) => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const next: Plan = customer.plan === 'PERSONAL' ? 'EMPRESA' : 'PERSONAL';
  const [maxUnits, setMaxUnits] = useState(Math.max(units, DEFAULT_MAX_UNITS[next]));
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMaxUnits(Math.max(units, DEFAULT_MAX_UNITS[next]));
    setReason('');
    setPassword('');
  }, [customer.plan, units, next]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await consoleApi.changePlan(customer.id, { plan: next, maxUnits, reason: reason.trim() }, password);
      toast(`${customer.name} ahora tiene el plan ${PLAN_LABELS[next]}`, 'success');
      onSaved(updated);
    } catch (err: any) {
      setError(err.message);
      setPassword('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-3">
      {error ? <ErrorBanner message={error} /> : null}
      <View className={`rounded-xl p-4 ${t.input}`}>
        <Text className={`text-[12.5px] ${t.muted}`}>Plan actual</Text>
        <Text className={`text-[18px] font-extrabold ${t.text}`}>
          {PLAN_LABELS[customer.plan]} · {customer.maxUnits} unidades
        </Text>
        <Text className={`text-[12.5px] mt-0.5 ${t.muted}`}>{units} unidades dadas de alta</Text>
      </View>
      <ScopeOption
        icon={ArrowLeftRight}
        title={`Cambiar a ${PLAN_LABELS[next]}`}
        hint={next === 'PERSONAL' ? 'App simplificada, una sola cuenta, historial de 30 días.' : 'Usuarios, roles, geocercas, reportes completos.'}
        active
        onPress={() => undefined}
      />
      <Field label="Unidades contratadas en el plan nuevo" value={String(maxUnits)} onChangeText={(v) => setMaxUnits(Number(v.replace(/[^0-9]/g, '')) || 0)} keyboardType="number-pad" />
      {maxUnits < units ? <Text className="text-[12px] text-amber-600 ml-1">Ya tiene {units} unidades; no podrá dar de alta más hasta que subas el límite.</Text> : null}
      <Field label="Motivo del cambio" placeholder="Ej. el cliente contrató más unidades y usuarios" value={reason} onChangeText={setReason} multiline maxLength={300} />
      <Field icon={Lock} label="Tu contraseña" placeholder="Confirma con tu contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      <Text className={`text-[12px] ml-1 ${t.muted}`}>No se borra ningún dato. El cambio, el motivo y quién lo hizo quedan en los movimientos del cliente.</Text>
      <Button variant="accent" label={`Cambiar a ${PLAN_LABELS[next]}`} icon={ArrowLeftRight} onPress={save} loading={saving} disabled={reason.trim().length < 5 || !password || maxUnits < 1} />
    </View>
  );
}

function History({ customerId }: { customerId: string }) {
  const { t } = useTheme();
  const { data, loading } = useApi(() => consoleApi.companyHistory(customerId), [customerId]);
  if (loading && !data) return <Loading />;
  if (!data?.length) return <Text className={`text-[13.5px] ${t.muted}`}>Sin movimientos registrados.</Text>;
  return (
    <View>
      {data.map((log, i) => {
        const detail = movementDetail(log);
        return (
          <View key={log.id} className={`flex-row gap-3 py-3 ${i < data.length - 1 ? `border-b ${t.border}` : ''}`}>
            {log.success ? <CheckCircle2 size={16} color="#22c55e" /> : <XCircle size={16} color="#ef4444" />}
            <View className="flex-1 min-w-0">
              <Text className={`text-[13.5px] font-semibold ${t.text}`}>{auditLabel(log.action)}</Text>
              {detail ? <Text className={`text-[12.5px] mt-0.5 ${t.text}`}>{detail}</Text> : null}
              <Text className={`text-[12px] mt-0.5 ${t.muted}`}>
                {log.actorEmail}
                {log.actorRole ? ` · ${staffRoleLabel(log.actorRole)}` : ''} · {formatDateTime(log.createdAt)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function CustomerSheet({
  companyId,
  units,
  section,
  canBill,
  onClose,
  onChanged,
}: {
  companyId: string | null;
  units: number;
  section: CustomerSection;
  canBill: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, loading, refresh } = useApi(() => (companyId ? consoleApi.company(companyId) : Promise.resolve(null)), [companyId]);
  const [current, setCurrent] = useState<CustomerSection>(section);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  useEffect(() => setCurrent(section), [section, companyId]);
  useEffect(() => setCustomer(data), [data]);

  const saved = (updated: CustomerDetail) => {
    setCustomer(updated);
    refresh();
    onChanged();
  };

  const sections = SECTIONS.filter((s) => canBill || s.key === 'history');
  const active = canBill ? current : 'history';

  return (
    <Sheet visible={!!companyId} onClose={onClose} title={customer ? customer.name : 'Cliente'}>
      <View className="gap-4 pb-2">
        <ChipRow>
          {sections.map((s) => (
            <Chip key={s.key} label={s.label} active={active === s.key} onPress={() => setCurrent(s.key)} surface />
          ))}
        </ChipRow>
        {loading && !customer ? (
          <Loading />
        ) : !customer ? null : active === 'data' ? (
          <DataForm customer={customer} onSaved={saved} />
        ) : active === 'plan' ? (
          <PlanForm customer={customer} units={units} onSaved={saved} />
        ) : (
          <History key={`${customer.id}-${customer.plan}-${customer.name}`} customerId={customer.id} />
        )}
      </View>
    </Sheet>
  );
}
