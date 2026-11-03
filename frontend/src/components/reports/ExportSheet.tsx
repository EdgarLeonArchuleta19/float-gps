import { FileSpreadsheet, FileText, Mail, MessageCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { exportPdf, exportSpreadsheet, shareEmail, shareWhatsApp, type ExportTable } from '@/lib/exporters';
import { Sheet } from '@/components/ui';
import MenuRow from '@/components/shared/MenuRow';

const OPTIONS: { icon: LucideIcon; label: string; hint: string; run: (table: ExportTable) => Promise<unknown> | void }[] = [
  { icon: FileText, label: 'PDF', hint: 'Documento para imprimir o archivar', run: exportPdf },
  { icon: FileSpreadsheet, label: 'Excel', hint: 'Hoja de cálculo con todas las filas', run: exportSpreadsheet },
  { icon: MessageCircle, label: 'WhatsApp', hint: 'Resumen en texto', run: shareWhatsApp },
  { icon: Mail, label: 'Correo', hint: 'Resumen en un correo nuevo', run: shareEmail },
];

export default function ExportSheet({ table, visible, onClose }: { table: ExportTable; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  return (
    <Sheet visible={visible} onClose={onClose} title="Exportar reporte">
      {OPTIONS.map((o, i) => (
        <MenuRow
          key={o.label}
          icon={o.icon}
          label={o.label}
          hint={o.hint}
          last={i === OPTIONS.length - 1}
          onPress={async () => {
            onClose();
            try {
              await o.run(table);
            } catch (err: any) {
              toast(err?.message || 'No se pudo exportar', 'error');
            }
          }}
        />
      ))}
    </Sheet>
  );
}
