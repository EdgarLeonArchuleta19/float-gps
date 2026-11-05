import { useState } from 'react';
import { View } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Button, Field, Sheet } from '@/components/ui';
import OptionPicker from './OptionPicker';
import { consoleApi, type NewCustomerUser, type ConsoleCompany } from './consoleApi';

const EMPTY: NewCustomerUser = { name: '', email: '', password: '', companyId: '' };

export default function UserFormSheet({
  visible,
  companies,
  onClose,
  onSaved,
}: {
  visible: boolean;
  companies: ConsoleCompany[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<NewCustomerUser>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof NewCustomerUser>(key: K, value: NewCustomerUser[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.companyId) {
      toast('Completa nombre, correo, contraseña y empresa', 'error');
      return;
    }
    const company = companies.find((c) => c.id === form.companyId)?.name || 'la empresa';
    const ok = await confirm({
      title: 'Crear administrador',
      message: `${form.name.trim()} (${form.email.trim()}) podrá entrar y administrar todo en ${company}.`,
      confirmLabel: 'Crear administrador',
      icon: UserPlus,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await consoleApi.createUser(form);
      toast('Usuario creado exitosamente', 'success');
      setForm(EMPTY);
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Error al crear usuario', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nuevo administrador de empresa">
      <View className="gap-3 pb-2">
        <OptionPicker
          label="Empresa"
          value={form.companyId}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => set('companyId', v)}
          placeholder="Selecciona una empresa"
        />
        <Field label="Nombre" value={form.name} onChangeText={(v) => set('name', v)} />
        <Field label="Correo" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Contraseña" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry />
        <Button variant="accent" label="Crear administrador" onPress={save} loading={saving} className="mt-1" />
      </View>
    </Sheet>
  );
}
