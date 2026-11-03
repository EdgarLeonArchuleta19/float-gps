import { useState } from 'react';
import { Text, View } from 'react-native';
import { Building2, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, PageHeader, Screen, SectionTitle } from '@/components/ui';
import MenuRow from '@/components/shared/MenuRow';
import ChangePasswordSheet from '@/components/profile/ChangePasswordSheet';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Dueño',
  admin: 'Administrador',
  operator: 'Operador',
  viewer: 'Solo lectura',
};

export default function Profile() {
  const { t } = useTheme();
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Screen maxWidth={720}>
      <PageHeader title="Mi perfil" back="/more" />
      <Card>
        <MenuRow icon={ShieldCheck} label={user?.name || ''} hint={ROLE_LABELS[user?.role || ''] || user?.role} />
        <MenuRow icon={Mail} label="Correo" hint={user?.email} />
        <MenuRow icon={Building2} label="Empresa" hint={user?.companyName || '—'} last />
      </Card>

      <SectionTitle>Seguridad</SectionTitle>
      <Card>
        <MenuRow icon={KeyRound} label="Cambiar contraseña" hint="Requiere tu contraseña actual" onPress={() => setPasswordOpen(true)} last />
      </Card>

      <View className="mt-5">
        <Card>
          <MenuRow icon={LogOut} label="Cerrar sesión" onPress={logout} danger last />
        </Card>
      </View>
      <Text className={`text-[11px] text-center mt-4 ${t.subtle}`}>Tu sesión se guarda cifrada en este dispositivo.</Text>
      <ChangePasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Screen>
  );
}
