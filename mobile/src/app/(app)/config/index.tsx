import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Check, Code2, Info, Monitor, Moon, Server, Sun, UserRound } from 'lucide-react-native';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { API_URL } from '@/lib/apiUrl';
import { APP_NAME, MAKER_CREDIT } from '@/lib/brand';
import { Card, PageHeader, Screen, SectionTitle } from '@/components/ui';
import MenuRow from '@/components/shared/MenuRow';
import WorkScheduleCard from '@/components/config/WorkScheduleCard';
import { useCanAdmin } from '@/hooks/useCanAdmin';

const THEMES: { key: ThemePreference; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Claro', icon: Sun },
  { key: 'dark', label: 'Oscuro', icon: Moon },
  { key: 'system', label: 'Automático (sistema)', icon: Monitor },
];

export default function Config() {
  const { t, preference, setPreference } = useTheme();
  const canAdmin = useCanAdmin();
  return (
    <Screen maxWidth={720}>
      <PageHeader title="Configuración" back="/more" />
      <SectionTitle>Apariencia</SectionTitle>
      <Card>
        {THEMES.map((th, i) => (
          <MenuRow
            key={th.key}
            icon={th.icon}
            label={th.label}
            onPress={() => setPreference(th.key)}
            last={i === THEMES.length - 1}
            right={preference === th.key ? <Check size={18} color={t.hex.primary} /> : <View />}
          />
        ))}
      </Card>

      <SectionTitle>Horario laboral</SectionTitle>
      <WorkScheduleCard editable={canAdmin} />

      <SectionTitle>Cuenta</SectionTitle>
      <Card>
        <MenuRow icon={UserRound} label="Perfil y contraseña" onPress={() => router.push('/profile')} last />
      </Card>

      <SectionTitle>Acerca de</SectionTitle>
      <Card>
        <MenuRow icon={Info} label={APP_NAME} right={<Text className={`text-[13px] ${t.muted}`}>{Constants.expoConfig?.version || '1.0.0'}</Text>} />
        <MenuRow icon={Server} label="Servidor" hint={API_URL} right={<View />} />
        <MenuRow icon={Code2} label="Desarrollado por" hint={MAKER_CREDIT} right={<View />} last />
      </Card>
    </Screen>
  );
}
