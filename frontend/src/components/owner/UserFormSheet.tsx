import { useState } from 'react';
import { View } from 'react-native';
import { useToast } from '@/context/ToastContext';
import { Button, Field, Sheet } from '@/components/ui';
import OptionPicker from './OptionPicker';
import { ownerApi, type NewOwnerUser, type OwnerCompany } from './ownerApi';

const EMPTY: NewOwnerUser = { name: '', email: '', password: '', companyId: '' };

export default function UserFormSheet({
  visible,
  companies,
  onClose,
  onSaved,
}: {
  visible: boolean;
  companies: OwnerCompany[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<NewOwnerUser>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof NewOwnerUser>(key: K, value: NewOwnerUser[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.companyId) {
      toast('Completa nombre, correo, contraseña y empresa', 'error');
      return;
    }
    setSaving(true);
    try {
      await ownerApi.createUser(form);
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
        <Button label="Crear administrador" onPress={save} loading={saving} className="mt-1" />
      </View>
    </Sheet>
  );
}
