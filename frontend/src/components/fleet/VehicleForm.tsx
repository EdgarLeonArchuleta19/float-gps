import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Plus, Save } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import type { Figure, Vehicle } from '@/lib/types';
import { NAVY } from '@/lib/brand';
import { ColorPicker, FigurePicker } from '@/components/units/LookPickers';
import { Button, Card, Chip, ChipRow, ErrorBanner, Field, SectionTitle } from '@/components/ui';

const TYPES = ['Pickup', 'Sedán', 'SUV', 'Camión', 'Tractocamión', 'Autobús', 'Motocicleta'];

export default function VehicleForm({ initial }: { initial?: Vehicle }) {
  const { t } = useTheme();
  const toast = useToast();
  const [name, setName] = useState(initial?.name || '');
  const [plate, setPlate] = useState(initial?.plate || '');
  const [type, setType] = useState(initial?.type || TYPES[0]);
  const [brand, setBrand] = useState(initial?.brand || '');
  const [model, setModel] = useState(initial?.vehicleModel || '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [color, setColor] = useState(initial?.color || '');
  const [imei, setImei] = useState(initial?.gpsDevice?.imei || '');
  const [sim, setSim] = useState(initial?.gpsDevice?.simNumber || '');
  const [figure, setFigure] = useState<Figure | null>(initial?.figure || null);
  const [iconColor, setIconColor] = useState<string | null>(initial?.iconColor || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const types = TYPES.includes(type) ? TYPES : [...TYPES, type];
  const canSave = !!name.trim() && !!plate.trim();

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const data = {
      name: name.trim(),
      plate: plate.trim().toUpperCase(),
      type,
      brand: brand.trim() || undefined,
      vehicleModel: model.trim() || undefined,
      year: year ? Number(year) : undefined,
      color: color.trim() || undefined,
      figure,
      iconColor,
      gps: imei.trim() ? { imei: imei.trim(), simNumber: sim.trim() || undefined } : undefined,
    };
    try {
      const saved = initial ? await api.vehicles.update(initial.id, data) : await api.vehicles.create(data);
      toast(initial ? 'Unidad actualizada' : 'Unidad registrada', 'success');
      router.replace(`/units/${saved.id}?kind=vehicle` as never);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {error ? <ErrorBanner message={error} /> : null}
      <Card className="p-4">
        <View className="gap-3">
          <Field label="Nombre" placeholder="Ej. Pickup 12" value={name} onChangeText={setName} />
          <Field label="Placa" placeholder="ABC-1234" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          <View className="gap-1.5">
            <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Tipo</Text>
            <ChipRow>
              {types.map((ty) => (
                <Chip key={ty} label={ty} active={type === ty} onPress={() => setType(ty)} surface />
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
      <SectionTitle>En el mapa</SectionTitle>
      <Card className="p-4">
        <View className="gap-4">
          <FigurePicker value={figure} kind="vehicle" color={iconColor || NAVY} onChange={setFigure} />
          <ColorPicker value={iconColor} onChange={setIconColor} />
        </View>
      </Card>
      <SectionTitle>GPS</SectionTitle>
      <Card className="p-4">
        <View className="gap-3">
          <Field label="IMEI / Unit ID" value={imei} onChangeText={setImei} keyboardType="number-pad" editable={!initial?.gpsDevice} />
          <Field label="Número SIM" value={sim} onChangeText={setSim} keyboardType="phone-pad" />
        </View>
      </Card>
      <Button label={initial ? 'Guardar cambios' : 'Registrar unidad'} icon={initial ? Save : Plus} onPress={save} loading={saving} disabled={!canSave} className="mt-4" />
    </View>
  );
}
