import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Button, Card, Chip, ChipRow, ErrorBanner, Field, PageHeader, Screen, SectionTitle } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';

const TYPES = ['Pickup', 'Sedán', 'SUV', 'Camión', 'Tractocamión', 'Autobús', 'Motocicleta'];

export default function NewUnit() {
  const { t } = useTheme();
  const toast = useToast();
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [imei, setImei] = useState('');
  const [sim, setSim] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = !!name.trim() && !!plate.trim();

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.vehicles.create({
        name: name.trim(),
        plate: plate.trim().toUpperCase(),
        type,
        brand: brand.trim() || undefined,
        vehicleModel: model.trim() || undefined,
        year: year ? Number(year) : undefined,
        color: color.trim() || undefined,
        gps: imei.trim() ? { imei: imei.trim(), simNumber: sim.trim() || undefined } : undefined,
      });
      toast('Unidad registrada', 'success');
      router.replace(`/units/${created.id}?kind=vehicle` as never);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminOnly>
      <Screen maxWidth={640}>
        <PageHeader title="Agregar unidad" back="/fleet" subtitle="El GPS es opcional; puedes vincularlo después" />
        {error ? <ErrorBanner message={error} /> : null}
        <Card className="p-4">
          <View className="gap-3">
            <Field label="Nombre" placeholder="Ej. Pickup 12" value={name} onChangeText={setName} />
            <Field label="Placa" placeholder="ABC-1234" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
            <View className="gap-1.5">
              <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>Tipo</Text>
              <ChipRow>
                {TYPES.map((ty) => (
                  <Chip key={ty} label={ty} active={type === ty} onPress={() => setType(ty)} />
                ))}
              </ChipRow>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Marca" value={brand} onChangeText={setBrand} />
              </View>
              <View className="flex-1">
                <Field label="Modelo" value={model} onChangeText={setModel} />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Año" value={year} onChangeText={(v) => setYear(v.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" />
              </View>
              <View className="flex-1">
                <Field label="Color" value={color} onChangeText={setColor} />
              </View>
            </View>
          </View>
        </Card>
        <SectionTitle>GPS</SectionTitle>
        <Card className="p-4">
          <View className="gap-3">
            <Field label="IMEI / Unit ID" value={imei} onChangeText={setImei} keyboardType="number-pad" />
            <Field label="Número SIM" value={sim} onChangeText={setSim} keyboardType="phone-pad" />
          </View>
        </Card>
        <Button label="Registrar unidad" icon={Plus} onPress={save} loading={saving} disabled={!canSave} className="mt-4" />
      </Screen>
    </AdminOnly>
  );
}
