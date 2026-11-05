import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeft, Building2, UserPlus, UserRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { DEFAULT_MAX_UNITS, PLAN_LABELS } from '@/lib/plans';
import { isStrongPassword } from '@/lib/passwordPolicy';
import type { Plan } from '@/lib/types';
import ScopeOption from '@/components/shared/ScopeOption';
import PasswordChecklist from '@/components/shared/PasswordChecklist';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';
import { consoleApi, type NewCompany } from './consoleApi';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

function emptyForm(plan: Plan): NewCompany {
  return {
    plan,
    name: '',
    legalName: '',
    taxId: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: '',
    maxUnits: DEFAULT_MAX_UNITS[plan],
    notes: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  };
}

function Section({ children }: { children: string }) {
  const { t } = useTheme();
  return <Text className={`text-[15px] font-bold mt-2 ${t.text}`}>{children}</Text>;
}

export default function CompanyFormSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<NewCompany>(emptyForm('EMPRESA'));
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPlan(null);
    setRepeat('');
    setError('');
  }, [visible]);

  const choose = (next: Plan) => {
    setPlan(next);
    setForm(emptyForm(next));
    setRepeat('');
    setError('');
  };

  const set = <K extends keyof NewCompany>(key: K, value: NewCompany[K]) => setForm((f) => ({ ...f, [key]: value }));
  const business = plan === 'EMPRESA';
  const phoneOk = form.contactPhone.replace(/\D/g, '').length >= 10;
  const rfc = form.taxId.trim().toUpperCase();
  const accessOk = form.adminName.trim().length >= 2 && EMAIL_PATTERN.test(form.adminEmail.trim()) && isStrongPassword(form.adminPassword) && form.adminPassword === repeat;
  const businessOk =
    !business ||
    (form.name.trim().length >= 2 && form.legalName.trim().length >= 2 && RFC_PATTERN.test(rfc) && EMAIL_PATTERN.test(form.contactEmail.trim()) && form.address.trim().length >= 5);
  const canSave = !!plan && accessOk && businessOk && phoneOk && form.maxUnits > 0;

  const save = async () => {
    if (!plan || !canSave) return;
    const display = business ? form.name.trim() : form.adminName.trim();
    const ok = await confirm({
      title: `Crear cliente ${PLAN_LABELS[plan]}`,
      message: `Se dará de alta "${display}" con plan ${PLAN_LABELS[plan]} y ${form.maxUnits} unidades. ${form.adminName.trim()} podrá entrar con ${form.adminEmail.trim()}.`,
      confirmLabel: 'Crear cliente',
      icon: business ? Building2 : UserRound,
    });
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await consoleApi.createCompany({ ...form, taxId: rfc });
      toast(`${display} creado con plan ${PLAN_LABELS[plan]}`, 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={plan ? `Nuevo cliente ${PLAN_LABELS[plan]}` : 'Nuevo cliente'}>
      {!plan ? (
        <View className="gap-3 pb-2">
          <Text className={`text-[13.5px] ${t.muted}`}>¿Qué tipo de cliente vas a dar de alta?</Text>
          <ScopeOption icon={UserRound} title="Personal" hint="Una persona con sus vehículos. Una sola cuenta, app simplificada." active={false} onPress={() => choose('PERSONAL')} />
          <ScopeOption icon={Building2} title="Empresarial" hint="Empresa con flota, usuarios, roles, geocercas y reportes." active={false} onPress={() => choose('EMPRESA')} />
        </View>
      ) : (
        <View className="gap-3 pb-2">
          <Button label="Cambiar tipo de cliente" icon={ArrowLeft} variant="soft" compact onPress={() => setPlan(null)} className="self-start" />
          {error ? <ErrorBanner message={error} /> : null}

          {business ? (
            <>
              <Section>Datos de la empresa</Section>
              <Field label="Nombre comercial" placeholder="Transportes del Norte" value={form.name} onChangeText={(v) => set('name', v)} maxLength={80} />
              <Field label="Razón social" placeholder="Transportes del Norte S.A. de C.V." value={form.legalName} onChangeText={(v) => set('legalName', v)} maxLength={120} />
              <Field label="RFC" placeholder="TNO010203AB1" value={form.taxId} onChangeText={(v) => set('taxId', v.toUpperCase())} autoCapitalize="characters" maxLength={13} />
              {form.taxId && !RFC_PATTERN.test(rfc) ? <Text className="text-[12px] text-red-500 ml-1">El RFC debe tener 12 (empresa) o 13 caracteres.</Text> : null}
              <Field label="Correo de la empresa" placeholder="contacto@empresa.com" value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Teléfono" placeholder="667 123 4567" value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="phone-pad" />
              <Field label="Dirección fiscal" placeholder="Calle, número, colonia, ciudad, CP" value={form.address} onChangeText={(v) => set('address', v)} multiline maxLength={250} />
              <Field label="Sitio web (opcional)" placeholder="empresa.com" value={form.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" />
              <Field label="Unidades contratadas" value={String(form.maxUnits)} onChangeText={(v) => set('maxUnits', Number(v.replace(/[^0-9]/g, '')) || 0)} keyboardType="number-pad" />
              <Section>Administrador de la empresa</Section>
              <Text className={`text-[12.5px] ${t.muted}`}>Es quien entra a la app y da de alta a los demás usuarios.</Text>
              <Field label="Nombre" placeholder="Nombre del administrador" value={form.adminName} onChangeText={(v) => set('adminName', v)} maxLength={80} />
            </>
          ) : (
            <>
              <Section>Datos del cliente</Section>
              <Field label="Nombre completo" placeholder="Ej. María López" value={form.adminName} onChangeText={(v) => set('adminName', v)} maxLength={80} />
              <Field label="Teléfono" placeholder="667 123 4567" value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="phone-pad" />
              <Field label="Dirección (opcional)" placeholder="Para la instalación del GPS" value={form.address} onChangeText={(v) => set('address', v)} multiline maxLength={250} />
              <Field label="Vehículos contratados" value={String(form.maxUnits)} onChangeText={(v) => set('maxUnits', Number(v.replace(/[^0-9]/g, '')) || 0)} keyboardType="number-pad" />
              <Section>Acceso a la app</Section>
            </>
          )}

          <Field label="Correo de acceso" placeholder="correo@ejemplo.com" value={form.adminEmail} onChangeText={(v) => set('adminEmail', v)} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Contraseña inicial" value={form.adminPassword} onChangeText={(v) => set('adminPassword', v)} secureTextEntry />
          <Field label="Confirmar contraseña" value={repeat} onChangeText={setRepeat} secureTextEntry />
          {repeat && repeat !== form.adminPassword ? <Text className="text-[12px] text-red-500 ml-1">Las contraseñas no coinciden.</Text> : null}
          <PasswordChecklist password={form.adminPassword} />
          {form.contactPhone && !phoneOk ? <Text className="text-[12px] text-red-500 ml-1">El teléfono debe tener al menos 10 dígitos.</Text> : null}
          <Field label="Notas internas (opcional)" placeholder="Cómo nos contactó, forma de pago…" value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} />
          <Button variant="accent" label="Crear cliente" icon={UserPlus} onPress={save} loading={saving} disabled={!canSave} className="mt-1" />
        </View>
      )}
    </Sheet>
  );
}
