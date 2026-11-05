import { Linking, Platform, Text, View } from 'react-native';
import { Clock, Mail, MapPin, MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Card, PageHeader, Screen, SectionTitle } from '@/components/ui';
import { APP_NAME, MAKER_BRAND } from '@/lib/brand';
import MenuRow from '@/components/shared/MenuRow';
import { SUPPORT, GROUPS } from '@/components/help/content';
import Faq from '@/components/help/FaqItem';

function open(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url);
}

export default function Help() {
  const { t } = useTheme();
  return (
    <Screen maxWidth={760}>
      <PageHeader title="Centro de ayuda" back="/more" subtitle="Respuestas rápidas y contacto con soporte" />
      <Card>
        <MenuRow
          icon={MessageCircle}
          label="WhatsApp"
          hint={SUPPORT.phone}
          onPress={() => open(`https://wa.me/${SUPPORT.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, necesito asistencia con floaGPS: ')}`)}
        />
        <MenuRow icon={Mail} label="Correo" hint={SUPPORT.email} onPress={() => open(`mailto:${SUPPORT.email}`)} />
        <MenuRow icon={Clock} label="Horario" hint={SUPPORT.hours} />
        <MenuRow icon={MapPin} label="Oficinas" hint={SUPPORT.address} last />
      </Card>
      {GROUPS.map((g) => (
        <View key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <Card>
            {g.items.map((item, i) => (
              <Faq key={item.q} q={item.q} a={item.a} last={i === g.items.length - 1} />
            ))}
          </Card>
        </View>
      ))}
      <Text className={`text-[11.5px] text-center mt-6 ${t.subtle}`}>
        {APP_NAME} · {MAKER_BRAND}
      </Text>
    </Screen>
  );
}
