import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import type { Figure, UnitKind } from '@/lib/types';
import { NAVY } from '@/lib/brand';
import Tappable from '@/components/shared/Tappable';
import VehicleIcon from '@/components/shared/VehicleIcon';

const FIGURES: { value: Figure; label: string }[] = [
  { value: 'sedan', label: 'Sedán' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'truck', label: 'Camión' },
  { value: 'moto', label: 'Moto' },
  { value: 'tractor', label: 'Maquinaria' },
];

const COLORS = ['#032347', '#f87203', '#111827', '#ffffff', '#9ca3af', '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed', '#78350f'];

export function FigurePicker({ value, kind, color, onChange }: { value: Figure | null; kind: UnitKind; color: string; onChange: (figure: Figure) => void }) {
  const { t } = useTheme();
  const current = value || (kind === 'machine' ? 'tractor' : 'sedan');
  return (
    <View className="gap-2">
      <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Figura en el mapa</Text>
      <View className="flex-row flex-wrap gap-2">
        {FIGURES.map((f) => {
          const active = f.value === current;
          return (
            <Tappable
              key={f.value}
              onPress={() => onChange(f.value)}
              haptic
              accessibilityLabel={f.label}
              accessibilityState={{ selected: active }}
              className={`items-center gap-1 rounded-2xl py-3 ${active ? t.selected : t.input}`}
              style={{ width: '31%', borderWidth: 1.5, borderColor: active ? t.hex.onSelected : 'transparent' }}
            >
              <VehicleIcon kind={kind} figure={f.value} color={color} size={40} />
              <Text className={`text-[12px] font-semibold ${t.text}`}>{f.label}</Text>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}

export function ColorPicker({ value, onChange }: { value: string | null; onChange: (color: string | null) => void }) {
  const { t } = useTheme();
  return (
    <View className="gap-2">
      <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Color</Text>
      <View className="flex-row flex-wrap gap-2.5">
        <Tappable
          onPress={() => onChange(null)}
          haptic
          accessibilityLabel="Color según su estado"
          className={`h-10 px-3.5 rounded-full items-center justify-center ${value ? t.input : t.selected}`}
          style={{ borderWidth: 1.5, borderColor: value ? 'transparent' : t.hex.onSelected }}
        >
          <Text className={`text-[12px] font-semibold ${t.text}`}>Según estado</Text>
        </Tappable>
        {COLORS.map((c) => {
          const active = value?.toLowerCase() === c;
          return (
            <Tappable
              key={c}
              onPress={() => onChange(c)}
              haptic
              accessibilityLabel={`Color ${c}`}
              accessibilityState={{ selected: active }}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: c, borderWidth: c === '#ffffff' ? 1 : 0, borderColor: t.hex.border }}
            >
              {active ? <Check size={18} color={c === '#ffffff' ? NAVY : '#ffffff'} strokeWidth={3} /> : null}
            </Tappable>
          );
        })}
      </View>
      <Text className={`text-[12px] ml-1 ${t.muted}`}>Con un color propio, el estado se ve como un puntito sobre el vehículo.</Text>
    </View>
  );
}
