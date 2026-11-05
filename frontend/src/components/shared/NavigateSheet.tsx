import { Pressable, Text, View } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { availableNavigationApps, navigationAppLabel, openNavigation } from '@/lib/navigation';
import { Sheet } from '@/components/ui';

export default function NavigateSheet({
  target,
  onClose,
}: {
  target: { name: string; lat: number; lng: number } | null;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const toast = useToast();

  const open = async (app: ReturnType<typeof availableNavigationApps>[number]) => {
    if (!target) return;
    try {
      await openNavigation(app, target.lat, target.lng);
      onClose();
    } catch {
      toast(`No se pudo abrir ${navigationAppLabel(app)}`, 'error');
    }
  };

  return (
    <Sheet visible={!!target} onClose={onClose} title="Cómo llegar">
      {target ? (
        <View className="gap-2 pb-2">
          <Text className={`text-[13px] mb-1 ${t.muted}`}>
            Ruta hacia la última posición de <Text className={`font-semibold ${t.text}`}>{target.name}</Text> (
            {target.lat.toFixed(5)}, {target.lng.toFixed(5)})
          </Text>
          {availableNavigationApps().map((app) => (
            <Pressable
              key={app}
              onPress={() => open(app)}
              className={`flex-row items-center gap-3 rounded-2xl p-4 ${t.tonal} active:opacity-80`}
            >
              <Navigation size={18} color={t.hex.brand} />
              <Text className={`text-[14px] font-semibold ${t.text}`}>{navigationAppLabel(app)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}
