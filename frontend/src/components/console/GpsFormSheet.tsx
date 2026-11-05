import { useState } from 'react';
import { View } from 'react-native';
import { Radio } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Button, Field, Sheet } from '@/components/ui';
import OptionPicker from './OptionPicker';
import { consoleApi, type ConsoleCompany } from './consoleApi';

const MODELS = ['Cellocator CR300B Lite 3G', 'Concox GT06N', 'Teltonika FMB920', 'Coban GPS303'].map((m) => ({ value: m, label: m }));

export default function GpsFormSheet({
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
  const [imei, setImei] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [simNumber, setSimNumber] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!imei.trim()) {
      toast('El IMEI o Unit ID es obligatorio', 'error');
      return;
    }
    const company = companies.find((c) => c.id === companyId)?.name;
    const ok = await confirm({
      title: 'Registrar GPS',
      message: `Se agregará el equipo ${imei.trim()} (${model}) al inventario${company ? ` asignado a ${company}` : ' sin empresa'}.`,
      confirmLabel: 'Registrar',
      icon: Radio,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await consoleApi.createGps({ imei: imei.trim(), model, simNumber: simNumber.trim(), companyId: companyId || null });
      toast('Equipo GPS registrado en inventario', 'success');
      setImei('');
      setSimNumber('');
      setCompanyId('');
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Error al registrar GPS', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Registrar GPS">
      <View className="gap-3 pb-2">
        <Field label="IMEI / Unit ID" value={imei} onChangeText={setImei} keyboardType="number-pad" />
        <OptionPicker label="Modelo" value={model} options={MODELS} onChange={setModel} />
        <Field label="Número SIM" value={simNumber} onChangeText={setSimNumber} keyboardType="phone-pad" />
        <OptionPicker
          label="Empresa"
          value={companyId}
          options={[{ value: '', label: 'Dejar en stock libre' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
          onChange={setCompanyId}
        />
        <Button variant="accent" label="Registrar GPS" onPress={save} loading={saving} className="mt-1" />
      </View>
    </Sheet>
  );
}
