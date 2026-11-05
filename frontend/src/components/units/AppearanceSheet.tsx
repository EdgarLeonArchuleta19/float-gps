import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Save } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { markerColor } from '@/lib/format';
import type { Figure, FleetUnit } from '@/lib/types';
import { Button, ErrorBanner, Field, Sheet } from '@/components/ui';
import { ColorPicker, FigurePicker } from './LookPickers';

export default function AppearanceSheet({ unit, visible, onClose, onSaved }: { unit: FleetUnit; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(unit.name);
  const [figure, setFigure] = useState<Figure | null>(unit.figure || null);
  const [color, setColor] = useState<string | null>(unit.iconColor || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(unit.name);
    setFigure(unit.figure || null);
    setColor(unit.iconColor || null);
    setError('');
  }, [visible, unit]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.vehicles.setAppearance(unit.id, { name: name.trim(), figure, iconColor: color });
      toast('Vehículo actualizado', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Personalizar vehículo">
      <View className="gap-4 pb-2">
        {error ? <ErrorBanner message={error} /> : null}
        <Field label="Nombre" placeholder="Ej. Carro de mamá" value={name} onChangeText={setName} />
        <FigurePicker value={figure} kind={unit.kind} color={color || markerColor(unit.status)} onChange={setFigure} />
        <ColorPicker value={color} onChange={setColor} />
        <Button label="Guardar" icon={Save} onPress={save} loading={saving} disabled={!name.trim()} />
      </View>
    </Sheet>
  );
}
