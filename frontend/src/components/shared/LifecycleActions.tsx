import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PowerOff, RotateCcw, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export interface LifecycleNoun {
  label: string;
  feminine?: boolean;
}

export function ActionIcon({
  icon: Icon,
  label,
  color,
  busy,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  color?: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const tint = color || t.hex.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`w-8 h-8 rounded-lg border items-center justify-center ${t.card} ${t.border} ${disabled ? 'opacity-40' : 'active:opacity-60'}`}
    >
      {busy ? <ActivityIndicator size="small" color={tint} /> : <Icon size={15} color={tint} />}
    </Pressable>
  );
}

export default function LifecycleActions({
  noun,
  name,
  active,
  deactivateHint,
  onSetActive,
  onDelete,
  onChanged,
}: {
  noun: LifecycleNoun;
  name: string;
  active: boolean;
  deactivateHint?: string;
  onSetActive: (active: boolean) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onChanged: (deleted: boolean) => void;
}) {
  const { t } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<'toggle' | 'delete' | null>(null);
  const ending = noun.feminine ? 'a' : 'o';
  const Noun = noun.label.charAt(0).toUpperCase() + noun.label.slice(1);

  const run = async (kind: 'toggle' | 'delete', action: () => Promise<unknown>, done: string) => {
    setBusy(kind);
    try {
      await action();
      toast(done, 'success');
      onChanged(kind === 'delete');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const deactivate = async () => {
    const ok = await confirm({
      title: `Desactivar ${noun.label}`,
      message: `"${name}" quedará desactivad${ending}. ${deactivateHint ? `${deactivateHint} ` : ''}Podrás reactivarl${ending} cuando quieras.`,
      confirmLabel: 'Desactivar',
      icon: PowerOff,
    });
    if (ok) await run('toggle', () => onSetActive(false), `${Noun} desactivad${ending}`);
  };

  const reactivate = async () => {
    const ok = await confirm({
      title: `Reactivar ${noun.label}`,
      message: `"${name}" volverá a estar activ${ending} y disponible en el sistema.`,
      confirmLabel: 'Reactivar',
      icon: RotateCcw,
    });
    if (ok) await run('toggle', () => onSetActive(true), `${Noun} reactivad${ending}`);
  };

  const remove = async () => {
    const ok = await confirm({
      title: `¿Borrar ${noun.label}?`,
      message: `"${name}" ya no aparecerá en el sistema. Para recuperarl${ending} tendrás que contactar a soporte. Hazlo solo si estás seguro.`,
      confirmLabel: 'Borrar',
      destructive: true,
      icon: Trash2,
    });
    if (ok) await run('delete', onDelete, `${Noun} borrad${ending}. Soporte puede recuperarl${ending} si lo necesitas.`);
  };

  if (active) {
    return <ActionIcon icon={PowerOff} label={`Desactivar ${name}`} busy={busy === 'toggle'} onPress={deactivate} />;
  }
  return (
    <View className="flex-row gap-1.5">
      <ActionIcon icon={RotateCcw} label={`Reactivar ${name}`} color={t.hex.primary} busy={busy === 'toggle'} disabled={!!busy} onPress={reactivate} />
      <ActionIcon icon={Trash2} label={`Borrar ${name}`} color="#ef4444" busy={busy === 'delete'} disabled={!!busy} onPress={remove} />
    </View>
  );
}
