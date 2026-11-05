import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BellRing, Mail, Send } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { enablePush, pushSupported } from '@/lib/push';
import type { AlertType, NotificationSettings } from '@/lib/types';
import { Button, Card, Chip, ChipRow, Skeleton } from '@/components/ui';
import Toggle from '@/components/shared/Toggle';

const TYPES: { value: AlertType; label: string }[] = [
  { value: 'GEOFENCE', label: 'Geocercas' },
  { value: 'SOS', label: 'SOS y alarmas' },
  { value: 'OVERSPEED', label: 'Exceso de velocidad' },
  { value: 'LOW_BATTERY', label: 'Batería baja' },
  { value: 'IGNITION', label: 'Encendido y apagado' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
];

function ChannelRow({
  icon: Icon,
  title,
  hint,
  value,
  disabled,
  onChange,
  last,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? '' : `border-b ${t.border}`} ${disabled ? 'opacity-50' : ''}`}>
      <View className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
        <Icon size={18} color={t.hex.brand} />
      </View>
      <View className="flex-1">
        <Text className={`text-[14.5px] font-semibold ${t.text}`}>{title}</Text>
        <Text className={`text-[12px] ${t.muted}`}>{hint}</Text>
      </View>
      <Toggle value={value} disabled={disabled} onChange={onChange} label={title} />
    </View>
  );
}

export default function NotificationSettingsCard() {
  const { t } = useTheme();
  const toast = useToast();
  const { data, loading } = useApi(() => api.notifications.settings(), []);
  const [form, setForm] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm(data);
  }, [data]);

  if (loading && !form) {
    return (
      <Card className="p-4 gap-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </Card>
    );
  }
  if (!form) return null;

  const persist = async (next: NotificationSettings) => {
    setSaving(true);
    try {
      const saved = await api.notifications.save({
        pushEnabled: next.pushEnabled,
        emailEnabled: next.emailEnabled,
        types: next.types,
      });
      setForm(saved);
      return true;
    } catch (err: any) {
      toast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const togglePush = async (on: boolean) => {
    if (on && pushSupported()) {
      const allowed = await enablePush().catch(() => false);
      if (!allowed) toast('Activa los permisos de notificaciones de este dispositivo para recibir alertas aquí.', 'error');
    }
    await persist({ ...form, pushEnabled: on });
  };

  const toggleType = (type: AlertType) =>
    persist({ ...form, types: form.types.includes(type) ? form.types.filter((x) => x !== type) : [...form.types, type] });

  const test = async () => {
    setTesting(true);
    try {
      const res = await api.notifications.test();
      toast(res.message, 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="px-4 py-2">
      <ChannelRow
        icon={BellRing}
        title="Notificaciones push"
        hint={form.devices ? `En ${form.devices} dispositivo${form.devices === 1 ? '' : 's'}` : 'En este celular o navegador'}
        value={form.pushEnabled}
        onChange={togglePush}
      />
      <ChannelRow
        icon={Mail}
        title="Correo"
        hint={form.channels.email ? 'A tu correo de la cuenta' : 'El correo aún no está configurado en el servidor'}
        value={form.emailEnabled}
        disabled={!form.channels.email && !form.emailEnabled}
        onChange={(on) => persist({ ...form, emailEnabled: on })}
        last
      />
      <View className={`gap-2 py-3 border-t ${t.border}`}>
        <Text className={`text-[13px] font-semibold ml-1 ${t.muted}`}>Qué alertas quiero recibir</Text>
        <ChipRow>
          {TYPES.map((type) => (
            <Chip key={type.value} label={type.label} active={form.types.includes(type.value)} onPress={() => toggleType(type.value)} surface />
          ))}
        </ChipRow>
        <Text className={`text-[12px] ml-1 ${t.muted}`}>Solo te llegan alertas de las unidades que puedes ver. Las de geocercas se envían según lo que diga cada geocerca.</Text>
      </View>
      <View className="pb-3">
        <Button label="Enviarme una prueba" icon={Send} variant="secondary" compact onPress={test} loading={testing} disabled={saving} />
      </View>
    </Card>
  );
}
