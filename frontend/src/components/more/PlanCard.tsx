import { Linking, Platform, Text, View } from 'react-native';
import { Building2, Car, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlan } from '@/hooks/usePlan';
import { PLAN_LABELS } from '@/lib/plans';
import { Button, Card, SectionTitle } from '@/components/ui';
import { SUPPORT } from '@/components/help/content';

function openWhatsApp(message: string) {
  const url = `https://wa.me/${SUPPORT.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url);
}

export default function PlanCard() {
  const { t } = useTheme();
  const { user } = useAuth();
  const { plan, isPersonal } = usePlan();
  const Icon = isPersonal ? Car : Building2;
  return (
    <>
      <SectionTitle>Tu plan</SectionTitle>
      <Card className="p-5">
        <View className="flex-row items-center gap-3.5">
          <View className={`w-12 h-12 rounded-full items-center justify-center ${t.selected}`}>
            <Icon size={22} color={t.hex.onSelected} />
          </View>
          <View className="flex-1">
            <Text className={`text-[17px] font-extrabold tracking-tight ${t.text}`}>Plan {PLAN_LABELS[plan]}</Text>
            <Text className={`text-[13px] mt-0.5 ${t.muted}`}>
              {isPersonal ? 'Rastreo, alertas y paro de motor para tus vehículos.' : 'Todas las opciones para tu flota y tu equipo.'}
            </Text>
          </View>
        </View>
        {isPersonal ? (
          <Button
            label="Mejorar a Empresarial"
            icon={Sparkles}
            onPress={() => openWhatsApp(`Hola, quiero cambiar mi cuenta de floaGPS (${user?.email || ''}) al plan Empresarial.`)}
            className="mt-4"
          />
        ) : null}
      </Card>
    </>
  );
}
