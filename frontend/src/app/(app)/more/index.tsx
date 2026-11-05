import { cloneElement, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Boxes, ChevronRight, CircleDot, FileBarChart, HelpCircle, LogOut, Settings, ShieldCheck, Truck, UserRound, Users, Wrench } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAlarm } from '@/context/AlarmContext';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { useCan } from '@/hooks/useCan';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { ProfileAvatar } from '@/components/layout/HeaderActions';
import { Card, PageHeader, Screen, SectionTitle } from '@/components/ui';
import MenuRow from '@/components/shared/MenuRow';
import PlanCard from '@/components/more/PlanCard';
import { usePlan } from '@/hooks/usePlan';

export default function More() {
  const { user, logout } = useAuth();
  const { t } = useTheme();
  const alarm = useAlarm();
  const canAdmin = useCanAdmin();
  const can = useCan();
  const canAlerts = can('alerts');
  const { isPersonal, isClientPersonal } = usePlan();
  const { data } = useApi(() => (canAlerts ? api.dashboard.getStats() : Promise.resolve(null)), [canAlerts]);

  const operationRows = [
    can('alerts') ? (
      <MenuRow
        key="alerts"
        icon={Bell}
        label="Alertas"
        hint={alarm.active ? `Modo alarma activo en ${alarm.unitIds.length} unidades` : 'Eventos y modo alarma'}
        badge={data?.alertsCount}
        onPress={() => router.push('/notifications')}
      />
    ) : null,
    can('fleet') ? (
      <MenuRow
        key="fleet"
        icon={Truck}
        label={isPersonal ? 'Mis vehículos' : 'Flota'}
        hint={isClientPersonal ? 'Nombre, color y figura de tus vehículos' : canAdmin ? 'Vehículos y maquinaria de tu empresa' : 'Vehículos y maquinaria'}
        onPress={() => router.push('/fleet')}
      />
    ) : null,
    can('fleet') && !isClientPersonal ? (
      <MenuRow key="groups" icon={Boxes} label="Grupos" hint={canAdmin ? 'Organiza tus unidades por equipos' : 'Grupos de unidades'} onPress={() => router.push('/groups' as never)} />
    ) : null,
    can('maintenance') ? (
      <MenuRow key="maintenance" icon={Wrench} label="Mantenimiento" hint="Aceite, llantas, seguro y más" onPress={() => router.push('/maintenance' as never)} />
    ) : null,
    can('geofences') && !isClientPersonal ? (
      <MenuRow key="geofences" icon={CircleDot} label="Geocercas" hint={canAdmin ? 'Ver, crear y editar zonas' : 'Ver zonas'} onPress={() => router.push('/geofences')} />
    ) : null,
    can('reports') ? (
      <MenuRow key="reports" icon={FileBarChart} label="Reportes" hint="Kilómetros, horas y bitácora" onPress={() => router.push('/reports')} />
    ) : null,
  ].filter((row): row is ReactElement<{ last?: boolean }> => row !== null);

  return (
    <Screen maxWidth={720}>
      <PageHeader title="Más" />
      <Card onPress={() => router.push('/profile')}>
        <View className="p-5 flex-row items-center gap-4">
          <ProfileAvatar size={56} />
          <View className="flex-1">
            <Text className={`text-[17px] font-extrabold tracking-tight ${t.text}`}>{user?.name}</Text>
            <Text className={`text-[13px] mt-0.5 ${t.muted}`}>{user?.companyName || user?.email}</Text>
          </View>
          <ChevronRight size={18} color={t.hex.muted} />
        </View>
      </Card>

      {operationRows.length ? (
        <>
          <SectionTitle>Operación</SectionTitle>
          <Card className="overflow-hidden">{operationRows.map((row, i) => cloneElement(row, { last: i === operationRows.length - 1 }))}</Card>
        </>
      ) : null}

      {canAdmin && !isClientPersonal ? (
        <>
          <SectionTitle>Administración</SectionTitle>
          <Card className="overflow-hidden">
            <MenuRow icon={Users} label="Usuarios" hint="Accesos de tu empresa" onPress={() => router.push('/users')} />
            <MenuRow icon={ShieldCheck} label="Roles" hint="Qué ve cada usuario y qué unidades" onPress={() => router.push('/roles' as never)} last />
          </Card>
        </>
      ) : null}

      <PlanCard />

      <SectionTitle>Cuenta</SectionTitle>
      <Card className="overflow-hidden">
        <MenuRow icon={UserRound} label="Mi perfil" hint="Datos y contraseña" onPress={() => router.push('/profile')} />
        <MenuRow icon={Settings} label="Configuración" hint={isPersonal ? 'Notificaciones y tema' : 'Notificaciones, tema, empresa y horario'} onPress={() => router.push('/config')} />
        <MenuRow icon={HelpCircle} label="Centro de ayuda" hint="Preguntas frecuentes y soporte" onPress={() => router.push('/help')} last />
      </Card>

      <View className="mt-6">
        <Card className="overflow-hidden">
          <MenuRow icon={LogOut} label="Cerrar sesión" onPress={logout} danger last />
        </Card>
      </View>
    </Screen>
  );
}
