import { useState } from 'react';
import { Text, View } from 'react-native';
import { Copy, MapPin, MessageCircle, Share2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useFleet } from '@/hooks/useFleet';
import { copyLocations, shareLocations, whatsappLocations } from '@/lib/shareLocation';
import { hasPosition } from '@/lib/units';
import { Button, Card, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import UnitMultiSelect from '@/components/shared/UnitMultiSelect';
import ActionFooter from '@/components/shared/ActionFooter';

export default function ShareScreen() {
  const { t } = useTheme();
  const toast = useToast();
  const { units, loading, error } = useFleet(30000);
  const [selected, setSelected] = useState<string[]>([]);

  const located = units.filter(hasPosition);
  const chosen = located.filter((u) => selected.includes(u.id));
  const disabled = !chosen.length;

  const run = async (fn: () => Promise<unknown> | void, done?: string) => {
    try {
      await fn();
      if (done) toast(done, 'success');
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast(err?.message || 'No se pudo compartir', 'error');
    }
  };

  return (
    <View className={`flex-1 ${t.screen}`}>
      <Screen maxWidth={720}>
        <PageHeader title="Compartir ubicación" subtitle="Envía la posición actual de una o varias unidades" />
        <Card className="p-3 mb-4 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full items-center justify-center bg-blue-500/15">
            <MapPin size={17} color="#3b82f6" />
          </View>
          <Text className={`text-[12.5px] flex-1 ${t.muted}`}>
            Se envía un enlace de Google Maps por unidad con su velocidad. Solo aparecen unidades con posición reciente.
          </Text>
        </Card>
        {error ? <ErrorBanner message={error} /> : null}
        {loading && !units.length ? <Loading /> : <UnitMultiSelect units={located} selected={selected} onChange={setSelected} />}
      </Screen>
      <ActionFooter>
        <Button label="WhatsApp" icon={MessageCircle} iconColor="#25d366" variant="surface" onPress={() => run(() => whatsappLocations(chosen))} disabled={disabled} className="flex-1" compact />
        <Button label="Copiar" icon={Copy} variant="surface" onPress={() => run(() => copyLocations(chosen), 'Ubicaciones copiadas')} disabled={disabled} className="flex-1" compact />
        <Button
          label={chosen.length ? `Compartir (${chosen.length})` : 'Compartir'}
          icon={Share2}
          onPress={() =>
            run(async () => {
              if ((await shareLocations(chosen)) === 'copied') toast('Ubicaciones copiadas', 'success');
            })
          }
          disabled={disabled}
          className="flex-1"
          compact
        />
      </ActionFooter>
    </View>
  );
}
