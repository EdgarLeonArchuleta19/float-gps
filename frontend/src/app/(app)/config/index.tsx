import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Check, Code2, Info, Monitor, Moon, Server, Sun, UserRound } from 'lucide-react-native';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { getApiUrl } from '@/lib/apiUrl';
import { APP_NAME, MAKER_BRAND } from '@/lib/brand';
import { Card, PageHeader, Screen, SectionTitle } from '@/components/ui';
import MenuRow from '@/components/shared/MenuRow';
import WorkScheduleCard from '@/components/config/WorkScheduleCard';
import CompanyProfileCard from '@/components/config/CompanyProfileCard';
import SupportAccessCard from '@/components/config/SupportAccessCard';
import NotificationSettingsCard from '@/components/config/NotificationSettingsCard';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { usePlan } from '@/hooks/usePlan';

const THEMES: { key: ThemePreference; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Claro', icon: Sun },
  { key: 'dark', label: 'Oscuro', icon: Moon },
  { key: 'system', label: 'Automático (sistema)', icon: Monitor },
];

export default function Config() {
  const { t, preference, setPreference } = useTheme();
  const canAdmin = useCanAdmin();
  const { isPersonal, isSupport } = usePlan();
  return (
    <Screen maxWidth={720}>
      <PageHeader title="Configuración" back="/more" />
      {isSupport ? null : (
        <>
          <SectionTitle>Notificaciones</SectionTitle>
          <NotificationSettingsCard />
        </>
      )}

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

      {isPersonal ? null : (
        <>
          <SectionTitle>Datos de la empresa</SectionTitle>
          <CompanyProfileCard editable={canAdmin} />

          <SectionTitle>Horario laboral</SectionTitle>
          <WorkScheduleCard editable={canAdmin} />
        </>
      )}

      {canAdmin ? (
        <>
          <SectionTitle>Accesos de soporte</SectionTitle>
          <SupportAccessCard />
        </>
      ) : null}

      {isSupport ? null : (
        <>
          <SectionTitle>Cuenta</SectionTitle>
          <Card>
            <MenuRow icon={UserRound} label="Perfil y contraseña" onPress={() => router.push('/profile')} last />
          </Card>
        </>
      )}

      <SectionTitle>Acerca de</SectionTitle>
      <Card>
        <MenuRow icon={Info} label={APP_NAME} right={<Text className={`text-[13px] ${t.muted}`}>{Constants.expoConfig?.version || '1.0.0'}</Text>} />
        <MenuRow icon={Server} label="Servidor" hint={getApiUrl()} right={<View />} />
        <MenuRow icon={Code2} label={MAKER_BRAND} right={<View />} last />
      </Card>
    </Screen>
  );
}
