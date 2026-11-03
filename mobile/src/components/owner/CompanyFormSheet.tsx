import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button, Field, Sheet } from '@/components/ui';
import OptionPicker from './OptionPicker';
import { ownerApi, type NewCompany } from './ownerApi';

const EMPTY: NewCompany = {
  name: '',
  contactEmail: '',
  contactPhone: '',
  plan: 'PRO',
  maxUnits: 50,
  notes: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const PLANS = [
  { value: 'BASICO', label: 'BÁSICO' },
  { value: 'PRO', label: 'PRO' },
  { value: 'ENTERPRISE', label: 'ENTERPRISE' },
];

export default function CompanyFormSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState<NewCompany>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof NewCompany>(key: K, value: NewCompany[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      toast('El nombre de la empresa es obligatorio', 'error');
      return;
    }
    setSaving(true);
    try {
      await ownerApi.createCompany(form);
      toast('Empresa creada correctamente', 'success');
      setForm(EMPTY);
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Error al crear empresa', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nueva empresa">
      <View className="gap-3 pb-2">
        <Field label="Nombre" placeholder="Transportes del Norte" value={form.name} onChangeText={(v) => set('name', v)} />
        <Field label="Correo de contacto" value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Teléfono" value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="phone-pad" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <OptionPicker label="Plan" value={form.plan} options={PLANS} onChange={(v) => set('plan', v)} />
          </View>
          <View className="flex-1">
            <Field
              label="Límite de unidades"
              value={String(form.maxUnits)}
              onChangeText={(v) => set('maxUnits', Number(v.replace(/[^0-9]/g, '')) || 0)}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Field label="Notas" value={form.notes} onChangeText={(v) => set('notes', v)} multiline />
        <Text className={`text-[11px] font-semibold uppercase tracking-wider mt-2 ${t.subtle}`}>Administrador inicial (opcional)</Text>
        <Field placeholder="Nombre" value={form.adminName} onChangeText={(v) => set('adminName', v)} />
        <Field placeholder="Correo" value={form.adminEmail} onChangeText={(v) => set('adminEmail', v)} autoCapitalize="none" keyboardType="email-address" />
        <Field placeholder="Contraseña" value={form.adminPassword} onChangeText={(v) => set('adminPassword', v)} secureTextEntry />
        <Button label="Crear empresa" onPress={save} loading={saving} className="mt-1" />
      </View>
    </Sheet>
  );
}
