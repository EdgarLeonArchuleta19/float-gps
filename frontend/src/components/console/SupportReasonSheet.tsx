import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { LifeBuoy } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button, Chip, ChipRow, Field, Sheet } from '@/components/ui';
import type { ConsoleCompany } from './consoleApi';

const QUICK_REASONS = ['Cliente reporta GPS sin señal', 'Alta de unidades e instalación', 'Revisión de cuenta solicitada por el cliente', 'Ajuste de datos de unidades'];

export default function SupportReasonSheet({
  company,
  onClose,
  onConfirm,
}: {
  company: ConsoleCompany | null;
  onClose: () => void;
  onConfirm: (company: ConsoleCompany, reason: string) => Promise<void>;
}) {
  const { t } = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReason('');
  }, [company]);

  const valid = reason.trim().length >= 5;
  const confirm = async () => {
    if (!company || !valid) return;
    setBusy(true);
    try {
      await onConfirm(company, reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!company} onClose={onClose} title={company ? `Entrar a ${company.name}` : undefined}>
      <View className="gap-3 pb-2">
        <Text className={`text-[13.5px] ${t.muted}`}>
          Verás la cuenta como su administrador durante 2 horas. El motivo y cada cambio que hagas quedan en la bitácora, y el cliente puede ver este acceso.
        </Text>
        <ChipRow>
          {QUICK_REASONS.map((r) => (
            <Chip key={r} label={r} surface active={reason === r} onPress={() => setReason(r)} />
          ))}
        </ChipRow>
        <Field label="Motivo" placeholder="Ej. el cliente reporta que su camioneta no aparece" value={reason} onChangeText={setReason} maxLength={300} multiline />
        <Button variant="accent" label="Entrar en Modo Soporte" icon={LifeBuoy} onPress={confirm} loading={busy} disabled={!valid} />
      </View>
    </Sheet>
  );
}
