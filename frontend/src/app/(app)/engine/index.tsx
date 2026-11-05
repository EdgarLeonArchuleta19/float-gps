import { useState } from 'react';
import { Text, View } from 'react-native';
import { ShieldAlert, Zap } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFleet } from '@/hooks/useFleet';
import { Button, Card, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';
import EngineCommandSheet from '@/components/shared/EngineCommandSheet';
import ActionFooter from '@/components/shared/ActionFooter';

export default function EngineScreen() {
  const { t } = useTheme();
  const { units, loading, error } = useFleet(30000);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const withGps = units.filter((u) => u.gpsDevice);
  const chosen = withGps.filter((u) => selected.includes(u.id));

  return (
    <View className={`flex-1 ${t.screen}`}>
      <Screen maxWidth={720}>
        <PageHeader title="Paro de motor" subtitle="Detén o reanuda el motor de una o varias unidades" />
        <Card className="p-3 mb-4 flex-row items-start gap-3">
          <View className="w-9 h-9 rounded-xl items-center justify-center bg-amber-500/15">
            <ShieldAlert size={17} color="#f59e0b" />
          </View>
          <Text className={`text-[12.5px] flex-1 ${t.muted}`}>
            Úsalo solo con la unidad detenida o en caso de robo. Cada comando pide tu huella, Face ID o contraseña y queda registrado.
          </Text>
        </Card>
        {error ? <ErrorBanner message={error} /> : null}
        {loading && !units.length ? <Loading /> : <UnitMultiSelect units={withGps} selected={selected} onChange={setSelected} />}
      </Screen>
      <ActionFooter>
        <Button
          label={chosen.length ? `Continuar con ${chosen.length} ${chosen.length === 1 ? 'unidad' : 'unidades'}` : 'Selecciona unidades'}
          icon={Zap}
          variant="danger"
          onPress={() => setOpen(true)}
          disabled={!chosen.length}
          className="flex-1"
        />
      </ActionFooter>
      <EngineCommandSheet units={chosen} visible={open} onClose={() => setOpen(false)} onSent={() => setSelected([])} />
    </View>
  );
}
