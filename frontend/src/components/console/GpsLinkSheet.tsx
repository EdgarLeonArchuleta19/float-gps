import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Link2, ListChecks, Lock, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import ScopeOption from '@/components/shared/ScopeOption';
import SelectField from '@/components/shared/SelectField';
import { Button, ErrorBanner, Field, Loading, Sheet } from '@/components/ui';
import { consoleApi, type ConsoleGps, type NewVehicleForGps } from './consoleApi';

const EMPTY_VEHICLE: NewVehicleForGps = { name: '', plate: '', type: 'Camioneta', brand: '', vehicleModel: '' };

export default function GpsLinkSheet({ gps, onClose, onLinked }: { gps: ConsoleGps | null; onClose: () => void; onLinked: () => void }) {
  const { t } = useTheme();
  const toast = useToast();
  const companyId = gps?.companyId || null;
  const { data: units, loading } = useApi(() => (companyId ? consoleApi.companyUnits(companyId) : Promise.resolve([])), [companyId]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [unitId, setUnitId] = useState('');
  const [vehicle, setVehicle] = useState<NewVehicleForGps>(EMPTY_VEHICLE);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gps) return;
    setMode('existing');
    setUnitId('');
    setVehicle(EMPTY_VEHICLE);
    setPassword('');
    setError('');
  }, [gps]);

  const free = (units || []).filter((u) => !u.gps);
  const setField = <K extends keyof NewVehicleForGps>(key: K, value: string) => setVehicle((v) => ({ ...v, [key]: value }));
  const ready = mode === 'existing' ? !!unitId : vehicle.name.trim().length >= 1 && vehicle.plate.trim().length >= 1 && vehicle.type.trim().length >= 1;

  const link = async () => {
    if (!gps || !ready || !password) return;
    setSaving(true);
    setError('');
    const chosen = free.find((u) => u.id === unitId);
    try {
      await consoleApi.linkGps(gps.id, mode === 'existing' && chosen ? { unitKind: chosen.kind, unitId: chosen.id } : { newVehicle: vehicle }, password);
      toast(`GPS ${gps.imei} vinculado a ${mode === 'existing' ? chosen?.name : vehicle.name.trim()}`, 'success');
      onLinked();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setPassword('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={!!gps} onClose={onClose} title={gps ? `Vincular GPS ${gps.imei}` : undefined}>
      {gps ? (
        <View className="gap-3 pb-2">
          {error ? <ErrorBanner message={error} /> : null}
          <Text className={`text-[13px] ${t.muted}`}>
            Cliente: <Text className={`font-semibold ${t.text}`}>{gps.company?.name}</Text>. Desde que lo vincules, sus posiciones aparecen en el mapa del cliente.
          </Text>
          <ScopeOption icon={ListChecks} title="Unidad que ya existe" hint={`${free.length} unidades sin GPS`} active={mode === 'existing'} onPress={() => setMode('existing')} />
          <ScopeOption icon={Plus} title="Dar de alta un vehículo nuevo" hint="Lo registras y queda con este GPS" active={mode === 'new'} onPress={() => setMode('new')} />
          {mode === 'existing' ? (
            loading && !units ? (
              <Loading />
            ) : free.length ? (
              <SelectField
                label="Unidad"
                value={unitId}
                onChange={setUnitId}
                placeholder="Elige la unidad"
                options={free.map((u) => ({ value: u.id, label: u.name, hint: [u.kind === 'machine' ? 'Maquinaria' : 'Vehículo', u.detail].filter(Boolean).join(' · ') }))}
              />
            ) : (
              <Text className={`text-[13px] ${t.muted}`}>Todas las unidades de este cliente ya tienen GPS. Da de alta un vehículo nuevo.</Text>
            )
          ) : (
            <>
              <Field label="Nombre" placeholder="Ej. Reparto 04" value={vehicle.name} onChangeText={(v) => setField('name', v)} maxLength={80} />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Placa" placeholder="ABC-123" value={vehicle.plate} onChangeText={(v) => setField('plate', v.toUpperCase())} autoCapitalize="characters" maxLength={20} />
                </View>
                <View className="flex-1">
                  <Field label="Tipo" placeholder="Camioneta" value={vehicle.type} onChangeText={(v) => setField('type', v)} maxLength={40} />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Marca (opcional)" value={vehicle.brand} onChangeText={(v) => setField('brand', v)} maxLength={60} />
                </View>
                <View className="flex-1">
                  <Field label="Modelo (opcional)" value={vehicle.vehicleModel} onChangeText={(v) => setField('vehicleModel', v)} maxLength={60} />
                </View>
              </View>
            </>
          )}
          <Field icon={Lock} label="Tu contraseña" placeholder="Confirma con tu contraseña" secureTextEntry value={password} onChangeText={setPassword} />
          <Button variant="accent" label="Vincular GPS" icon={Link2} onPress={link} loading={saving} disabled={!ready || !password} />
        </View>
      ) : null}
    </Sheet>
  );
}
