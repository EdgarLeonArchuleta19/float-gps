import React, { useState, useMemo } from 'react';
import {
  FileText, Calendar, Download, FileSpreadsheet, Share2,
  MessageCircle, Mail, Truck, Clock, Route as RouteIcon, ScrollText
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { formatHours, formatKm, formatDate, formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import Pagination from '../components/Pagination';
import DatePicker from '../components/DatePicker';

type ReportTab = 'fleet' | 'daily' | 'hours' | 'mileage' | 'log';

interface ReportRow {
  id: string;
  unitName?: string;
  date?: string;
  totalHours?: number;
  movingHours?: number;
  idleHours?: number;
  kilometers?: number;
  sessions?: number;
}

interface UnitAgg {
  unit: string;
  km: number;
  total: number;
  moving: number;
  idle: number;
  sessions: number;
  days: number;
}

function aggregateByUnit(rows: ReportRow[]): UnitAgg[] {
  const map = new Map<string, UnitAgg>();
  rows.forEach((r) => {
    const k = r.unitName || '—';
    const cur = map.get(k) || { unit: k, km: 0, total: 0, moving: 0, idle: 0, sessions: 0, days: 0 };
    cur.km += r.kilometers || 0;
    cur.total += r.totalHours || 0;
    cur.moving += r.movingHours || 0;
    cur.idle += r.idleHours || 0;
    cur.sessions += r.sessions || 0;
    if (r.date) cur.days += 1;
    map.set(k, cur);
  });
  return [...map.values()];
}

const eventMeta = (type: string): { label: string; dot: string } => {
  switch (type) {
    case 'ENGINE_ON': return { label: 'Motor encendido', dot: '#16A34A' };
    case 'ENGINE_OFF': return { label: 'Motor apagado', dot: '#DC2626' };
    case 'SPEED_ALERT': return { label: 'Alerta de velocidad', dot: '#f87203' };
    case 'GEOFENCE_ENTER': return { label: 'Entró a geocerca', dot: '#032347' };
    case 'GEOFENCE_EXIT': return { label: 'Salió de geocerca', dot: '#64748B' };
    default: return { label: type, dot: '#94A3B8' };
  }
};

const TAB_META: Record<ReportTab, { label: string; desc: string; icon: any }> = {
  fleet: { label: 'Flota', desc: 'Acumulado por unidad', icon: Truck },
  daily: { label: 'Diaria', desc: 'Registro día por día', icon: Calendar },
  hours: { label: 'Horas', desc: 'Movimiento vs. detenido', icon: Clock },
  mileage: { label: 'Kilometraje', desc: 'Distribución del recorrido', icon: RouteIcon },
  log: { label: 'Bitácora', desc: 'Eventos del periodo', icon: ScrollText },
};

export default function Reports() {
  const { addToast } = useToast();
  const { darkMode } = useLayout();
  const [activeTab, setActiveTab] = useState<ReportTab>('fleet');
  const [periodKey, setPeriodKey] = useState('30d');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const applyPreset = (key: string) => {
    setPeriodKey(key); setPage(1);
    const today = new Date();
    const iso = (d: Date) => d.toISOString().split('T')[0];
    if (key === 'today') { setDateFrom(iso(today)); setDateTo(iso(today)); }
    else if (key === '7d') { const f = new Date(); f.setDate(f.getDate() - 6); setDateFrom(iso(f)); setDateTo(iso(today)); }
    else if (key === '30d') { const f = new Date(); f.setDate(f.getDate() - 29); setDateFrom(iso(f)); setDateTo(iso(today)); }
    else if (key === 'month') { setDateFrom(iso(new Date(today.getFullYear(), today.getMonth(), 1))); setDateTo(iso(today)); }
    else if (key === 'lastMonth') { setDateFrom(iso(new Date(today.getFullYear(), today.getMonth() - 1, 1))); setDateTo(iso(new Date(today.getFullYear(), today.getMonth(), 0))); }
  };

  const params: Record<string, string> = {};
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const source = activeTab === 'log' ? 'events' : activeTab === 'hours' ? 'hours' : 'daily';

  const { data: dailyRows, loading: dailyLoading } = useApi<ReportRow[]>(
    source === 'daily' ? () => api.reports.getDaily(params) : undefined!, ['daily', dateFrom, dateTo]);
  const { data: hourRows, loading: hourLoading } = useApi<ReportRow[]>(
    source === 'hours' ? () => api.reports.getHours(params) : undefined!, ['hours', dateFrom, dateTo]);
  const { data: logData, loading: logLoading } = useApi<any>(
    source === 'events' ? () => api.reports.getEvents(params) : undefined!, ['events', dateFrom, dateTo]);

  const loading = dailyLoading || hourLoading || logLoading;

  const fleetAgg = useMemo(() =>
    aggregateByUnit(source === 'hours' ? (hourRows || []) : (dailyRows || [])).sort((a, b) => b.km - a.km),
    [source, dailyRows, hourRows]);

  const mileageAgg = useMemo(() =>
    aggregateByUnit(dailyRows || []).sort((a, b) => b.km - a.km), [dailyRows]);

  const rows: ReportRow[] = activeTab === 'daily' ? (dailyRows || []) : activeTab === 'hours' ? (hourRows || []) : [];
  const events: any[] = activeTab === 'log' ? (logData || []) : [];

  const pagedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  const pagedEvents = useMemo(() => events.slice((page - 1) * pageSize, page * pageSize), [events, page, pageSize]);

  const totalKmAll = activeTab === 'mileage'
    ? mileageAgg.reduce((s, u) => s + u.km, 0)
    : fleetAgg.reduce((s, u) => s + u.km, 0);

  const getExportData = () => {
    const rangeLabel = `${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
    if (activeTab === 'log') return {
      title: 'Bitácora de eventos',
      columns: ['Fecha', 'Unidad', 'Evento', 'Detalle'],
      dataRows: events.map((e: any) => [formatDateTime(e.timestamp), e.unitName || '—',
        eventMeta(e.type).label, e.details || '']),
      summary: [`Eventos totales: ${events.length}`, `Periodo: ${rangeLabel}`],
    };
    if (activeTab === 'fleet') return {
      title: 'Resumen de flota',
      columns: ['Unidad', 'Kilómetros', 'Horas totales', 'En movimiento', 'Detenida', 'Sesiones', 'Días activos'],
      dataRows: fleetAgg.map((u) => [u.unit, Number(u.km.toFixed(1)), Number(u.total.toFixed(1)),
        Number(u.moving.toFixed(1)), Number(u.idle.toFixed(1)), u.sessions, u.days]),
      summary: [`Unidades: ${fleetAgg.length}`, `Km totales: ${formatKm(fleetAgg.reduce((s, u) => s + u.km, 0))}`,
        `Horas totales: ${formatHours(fleetAgg.reduce((s, u) => s + u.total, 0))}`, `Periodo: ${rangeLabel}`],
    };
    if (activeTab === 'mileage') return {
      title: 'Reporte de kilometraje',
      columns: ['#', 'Unidad', 'Kilómetros', '% de la flota'],
      dataRows: mileageAgg.map((u, i) => [i + 1, u.unit, Number(u.km.toFixed(1)),
        totalKmAll > 0 ? `${Math.round((u.km / totalKmAll) * 100)}%` : '0%']),
      summary: [`Km totales: ${formatKm(totalKmAll)}`, `Periodo: ${rangeLabel}`],
    };
    if (activeTab === 'hours') return {
      title: 'Horas de operación',
      columns: ['Unidad', 'Horas totales', 'En movimiento', 'Detenida'],
      dataRows: rows.map((r) => [r.unitName || '—', Number((r.totalHours ?? 0).toFixed(1)),
        Number((r.movingHours ?? 0).toFixed(1)), Number((r.idleHours ?? 0).toFixed(1))]),
      summary: [`Unidades: ${rows.length}`, `Periodo: ${rangeLabel}`],
    };
    return {
      title: 'Actividad diaria',
      columns: ['Fecha', 'Unidad', 'Horas', 'Movimiento', 'Detenida', 'Km'],
      dataRows: rows.map((r) => [r.date ? formatDate(r.date) : '—', r.unitName || '—',
        Number((r.totalHours ?? 0).toFixed(1)), Number((r.movingHours ?? 0).toFixed(1)),
        Number((r.idleHours ?? 0).toFixed(1)), Number((r.kilometers ?? 0).toFixed(1))]),
      summary: [`Registros: ${rows.length}`, `Periodo: ${rangeLabel}`],
    };
  };

  const fileBase = `reporte-${activeTab}-${dateFrom}-${dateTo}`;

  const buildPdfFile = async (): Promise<File> => {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = (autoTableMod as any).default ?? autoTableMod;
    const meta = getExportData();
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(3, 35, 71);
    doc.rect(0, 0, W, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.text(meta.title, 14, 12);
    doc.setFontSize(9); doc.text(`Float GPS · ${formatDate(dateFrom)} a ${formatDate(dateTo)}`, 14, 19);
    doc.setTextColor(60, 60, 60); doc.setFontSize(8);
    let y = 32;
    meta.summary.forEach((line) => { doc.text(line, 14, y); y += 5; });
    autoTable(doc, {
      startY: y + 3, head: [meta.columns],
      body: meta.dataRows.map((r) => r.map((c) => String(c))),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [3, 35, 71], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 246, 248] },
    });
    return new File([doc.output('blob')], `${fileBase}.pdf`, { type: 'application/pdf' });
  };

  const buildExcelFile = async (): Promise<File> => {
    const XLSX = await import('xlsx');
    const meta = getExportData();
    const ws = XLSX.utils.aoa_to_sheet([[meta.title],
      [`Float GPS · ${formatDate(dateFrom)} a ${formatDate(dateTo)}`], [],
      ...meta.summary.map((s) => [s]), [], meta.columns, ...meta.dataRows]);
    ws['!cols'] = meta.columns.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    return new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], `${fileBase}.xlsx`,
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  };

  const requireData = (): boolean => {
    if (getExportData().dataRows.length === 0) {
      addToast('info', activeTab === 'log' ? 'No hay eventos que exportar' : 'No hay datos que exportar en este periodo');
      return false;
    }
    return true;
  };

  const handleExportPdf = async () => {
    if (!requireData()) return;
    try { downloadFile(await buildPdfFile()); addToast('success', 'PDF generado'); }
    catch { addToast('error', 'No se pudo generar el PDF'); }
  };

  const handleExportExcel = async () => {
    if (!requireData()) return;
    try { downloadFile(await buildExcelFile()); addToast('success', 'Excel generado'); }
    catch { addToast('error', 'No se pudo generar el Excel'); }
  };

  const handleNativeShare = async (kind: 'pdf' | 'xlsx') => {
    if (!requireData()) return;
    try {
      const file = await (kind === 'pdf' ? buildPdfFile() : buildExcelFile());
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file], title: file.name });
      } else {
        addToast('info', 'Compartición de archivos no disponible; se descargó para que lo envíes desde tus archivos');
        downloadFile(file);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') addToast('error', 'No se pudo compartir');
    }
  };

  const shareSummaryText = (): string => {
    const meta = getExportData();
    return [
      `*Float GPS — ${meta.title}*`, ...meta.summary, '',
      ...(activeTab === 'fleet'
        ? fleetAgg.slice(0, 5).map((u) => `• ${u.unit}: ${formatKm(u.km)} · ${formatHours(u.total)}`)
        : activeTab === 'mileage'
          ? mileageAgg.slice(0, 5).map((u, i) => `${i + 1}. ${u.unit}: ${formatKm(u.km)}`)
          : []),
    ].join('\n');
  };

  const handleShareWhatsApp = () => {
    if (!requireData()) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareSummaryText())}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!requireData()) return;
    const meta = getExportData();
    window.location.href = `mailto:?subject=${encodeURIComponent(`Float GPS — ${meta.title}`)}&body=${encodeURIComponent(shareSummaryText().replace(/\*/g, ''))}`;
  };

  // ===== Línea de resumen del documento (estilo informe, no KPIs) =====
  const docStats: string[] = useMemo(() => {
    if (loading) return [];
    if (activeTab === 'fleet') return [
      `${fleetAgg.length} ${fleetAgg.length === 1 ? 'unidad' : 'unidades'}`,
      `${formatKm(fleetAgg.reduce((s, u) => s + u.km, 0))} recorridos`,
      `${formatHours(fleetAgg.reduce((s, u) => s + u.total, 0))} operadas`,
      `${fleetAgg.reduce((s, u) => s + u.days, 0)} jornadas`,
    ];
    if (activeTab === 'mileage') return [
      `${mileageAgg.length} unidades`, `${formatKm(totalKmAll)} totales`,
      mileageAgg.length ? `${formatKm(totalKmAll / mileageAgg.length)} promedio` : '',
    ].filter(Boolean);
    if (activeTab === 'hours') return [
      `${rows.length} unidades`,
      `${formatHours(rows.reduce((s, r) => s + (r.movingHours ?? 0), 0))} en movimiento`,
      `${formatHours(rows.reduce((s, r) => s + (r.idleHours ?? 0), 0))} detenida`,
    ];
    if (activeTab === 'log') return [`${events.length} eventos`];
    return [`${rows.length} registros`, `${formatKm(rows.reduce((s, r) => s + (r.kilometers ?? 0), 0))} acumulados`];
  }, [loading, activeTab, fleetAgg, mileageAgg, rows, events, totalKmAll]);

  const inputBg = darkMode ? 'bg-[#1a1a1a] text-[#f5f5f7]' : 'bg-white text-[#1d1d1f] border border-gray-200';
  const card = darkMode ? 'bg-[#111] border border-[#222]' : 'bg-white border border-gray-200';

  const presets = [
    { key: 'today', label: 'Hoy' }, { key: '7d', label: '7 días' }, { key: '30d', label: '30 días' },
    { key: 'month', label: 'Este mes' }, { key: 'lastMonth', label: 'Mes anterior' }, { key: 'custom', label: 'Rango' },
  ];

  const maxKm = Math.max(...mileageAgg.map((u) => u.km), 1);
  const activeMeta = TAB_META[activeTab];
  const genStamp = formatDateTime(new Date().toISOString());

  return (
    <div className="space-y-3 pb-24 lg:pb-4">
      {/* Controles */}
      <div className={`${card} rounded-xl p-2.5 sm:p-3 space-y-2.5`}>
        <div className="flex items-center gap-2">
          <span className={`hidden lg:block text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 px-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Reporte</span>
          <div className="flex gap-1 overflow-x-auto flex-1">
            {(Object.keys(TAB_META) as ReportTab[]).map((key) => (
              <button key={key} onClick={() => { setActiveTab(key); setPage(1); }}
                title={TAB_META[key].desc}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap flex-shrink-0 transition-colors
                  ${activeTab === key
                    ? darkMode ? 'bg-white text-[#111]' : 'bg-[#032347] text-white'
                    : darkMode ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'}`}>
                {TAB_META[key].label}
              </button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
            <ActionBtn darkMode={darkMode} onClick={handleExportExcel} icon={FileSpreadsheet} label="Excel" />
            <ActionBtn darkMode={darkMode} onClick={() => handleExportPdf()} icon={Download} label="PDF" />
            <span className={`w-px h-5 ${darkMode ? 'bg-[#222]' : 'bg-gray-200'}`} />
            <IconBtn darkMode={darkMode} onClick={() => handleNativeShare('pdf')} icon={Share2} title="Compartir PDF" />
            <IconBtn darkMode={darkMode} onClick={handleShareWhatsApp} icon={MessageCircle} title="Enviar resumen por WhatsApp" />
            <IconBtn darkMode={darkMode} onClick={handleShareEmail} icon={Mail} title="Enviar resumen por correo" />
          </div>
        </div>
        <div className={`h-px ${darkMode ? 'bg-[#222]' : 'bg-gray-100'}`} />
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 px-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Periodo</span>
          {presets.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium whitespace-nowrap flex-shrink-0 transition-colors border
                ${periodKey === p.key
                  ? darkMode ? 'border-gray-300 text-white' : 'border-[#032347] text-[#032347]'
                  : darkMode ? 'border-[#222] text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {periodKey === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
            <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
          </div>
        )}
      </div>

      {/* Documento */}
      <div className={`${card} rounded-xl overflow-hidden`}>
        {/* Encabezado del informe */}
        <div className="px-4 pt-3.5 pb-3">
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Reporte · {activeMeta.label}
          </p>
          <h2 className={`text-[15px] font-semibold mt-0.5 ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{activeMeta.desc}</h2>
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11.5px] tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <span>{formatDate(dateFrom)} — {formatDate(dateTo)}</span>
            <span aria-hidden>·</span>
            <span>generado {genStamp}</span>
          </div>
          {!loading && docStats.length > 0 && (
            <p className={`mt-2.5 text-[13px] font-medium tabular-nums ${darkMode ? 'text-gray-200' : 'text-[#032347]'}`}>
              {docStats.join('   ·   ')}
            </p>
          )}
        </div>
        <div className={`h-px ${darkMode ? 'bg-[#222]' : 'bg-gray-100'}`} />

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#032347]" />
          </div>
        ) : activeTab === 'fleet' && (
          fleetAgg.length === 0 ? <Empty darkMode={darkMode} text="Sin actividad en el periodo seleccionado." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr>
                    <Th darkMode={darkMode} align="left">Unidad</Th>
                    <Th darkMode={darkMode}>Km</Th>
                    <Th darkMode={darkMode} className="hidden sm:table-cell">Horas</Th>
                    <Th darkMode={darkMode} className="hidden md:table-cell">Movimiento</Th>
                    <Th darkMode={darkMode} className="hidden md:table-cell">Detenida</Th>
                    <Th darkMode={darkMode}>Días</Th>
                    <Th darkMode={darkMode} className="hidden lg:table-cell">Sesiones</Th>
                  </tr>
                </thead>
                <tbody>
                  {fleetAgg.map((u) => {
                    const pct = u.total > 0 ? Math.round((u.moving / u.total) * 100) : 0;
                    return (
                      <tr key={u.unit}>
                        <Td darkMode={darkMode} bold align="left">{u.unit}</Td>
                        <Td darkMode={darkMode}>{formatKm(u.km)}</Td>
                        <Td darkMode={darkMode} className="hidden sm:table-cell">{formatHours(u.total)}</Td>
                        <Td darkMode={darkMode} className="hidden md:table-cell">{formatHours(u.moving)}</Td>
                        <Td darkMode={darkMode} className="hidden md:table-cell">{formatHours(u.idle)}</Td>
                        <Td darkMode={darkMode}>{u.days}</Td>
                        <Td darkMode={darkMode} className="hidden lg:table-cell">{u.sessions}</Td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className={`border-t ${darkMode ? 'border-[#333]' : 'border-gray-200'}`}>
                    <Th darkMode={darkMode} align="left">Total</Th>
                    <Th darkMode={darkMode}>{formatKm(fleetAgg.reduce((s, u) => s + u.km, 0))}</Th>
                    <Th darkMode={darkMode} className="hidden sm:table-cell">{formatHours(fleetAgg.reduce((s, u) => s + u.total, 0))}</Th>
                    <Th darkMode={darkMode} className="hidden md:table-cell">{formatHours(fleetAgg.reduce((s, u) => s + u.moving, 0))}</Th>
                    <Th darkMode={darkMode} className="hidden md:table-cell">{formatHours(fleetAgg.reduce((s, u) => s + u.idle, 0))}</Th>
                    <Th darkMode={darkMode}>—</Th>
                    <Th darkMode={darkMode} className="hidden lg:table-cell">{fleetAgg.reduce((s, u) => s + u.sessions, 0)}</Th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}

        {activeTab === 'mileage' && (
          mileageAgg.length === 0
            ? <Empty darkMode={darkMode} text="Sin kilometraje registrado en el periodo." />
            : (
              <div className={`divide-y ${darkMode ? 'divide-[#222]' : 'divide-gray-100'}`}>
                <div className={`grid grid-cols-[28px_1fr_auto] gap-x-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span>#</span><span>Unidad</span><span>Km</span>
                </div>
                {mileageAgg.map((u, i) => (
                  <div key={u.unit} className="px-4 py-2.5 grid grid-cols-[28px_1fr_auto] gap-x-3 items-center">
                    <span className={`text-[12px] font-semibold tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{u.unit}</p>
                      <div className={`mt-1 h-[3px] rounded-full ${darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max((u.km / maxKm) * 100, 1.5)}%`, background: i === 0 ? '#f87203' : '#032347', opacity: i === 0 ? 1 : 0.25 + 0.75 * (1 - i / mileageAgg.length) }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[13px] font-semibold tabular-nums ${darkMode ? 'text-white' : 'text-[#032347]'}`}>{formatKm(u.km)}</p>
                      <p className={`text-[10.5px] tabular-nums ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {totalKmAll > 0 ? `${Math.round((u.km / totalKmAll) * 100)}%` : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}

        {activeTab === 'hours' && (
          rows.length === 0
            ? <Empty darkMode={darkMode} text="Sin horas de operación en el periodo." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] tabular-nums">
                  <thead>
                    <tr>
                      <Th darkMode={darkMode} align="left">Unidad</Th>
                      <Th darkMode={darkMode}>Horas</Th>
                      <Th darkMode={darkMode} className="hidden sm:table-cell">Movimiento</Th>
                      <Th darkMode={darkMode} className="hidden sm:table-cell">Detenida</Th>
                      <Th darkMode={darkMode} align="left" className="hidden md:table-cell">Composición</Th>
                      <Th darkMode={darkMode}>Km</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const t = (r.totalHours ?? 0);
                      const mv = t > 0 ? Math.round(((r.movingHours ?? 0) / t) * 100) : 0;
                      return (
                        <tr key={r.id || i}>
                          <Td darkMode={darkMode} bold align="left">{r.unitName || '—'}</Td>
                          <Td darkMode={darkMode}>{formatHours(t)}</Td>
                          <Td darkMode={darkMode} className="hidden sm:table-cell">{formatHours(r.movingHours ?? 0)}</Td>
                          <Td darkMode={darkMode} className="hidden sm:table-cell">{formatHours(r.idleHours ?? 0)}</Td>
                          <td className={`hidden md:table-cell px-3 py-2.5 border-t ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
                            <div className={`flex h-[6px] w-full max-w-[140px] rounded-full overflow-hidden ${darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-200'}`} title={`${mv}% movimiento`}>
                              <div style={{ width: `${mv}%`, background: '#032347' }} />
                            </div>
                            <span className={`mt-1 inline-block text-[10.5px] tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{mv}% activo</span>
                          </td>
                          <Td darkMode={darkMode}>{formatKm(r.kilometers ?? 0)}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        )}

        {activeTab === 'daily' && (
          rows.length === 0
            ? <Empty darkMode={darkMode} text="Sin registros diarios en el periodo." />
            : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] tabular-nums">
                    <thead>
                      <tr>
                        <Th darkMode={darkMode} align="left">Fecha</Th>
                        <Th darkMode={darkMode} align="left" className="hidden sm:table-cell">Unidad</Th>
                        <Th darkMode={darkMode}>Km</Th>
                        <Th darkMode={darkMode}>Horas</Th>
                        <Th darkMode={darkMode} className="hidden sm:table-cell">Mov.</Th>
                        <Th darkMode={darkMode} className="hidden md:table-cell">Det.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((r, i) => (
                        <tr key={r.id || i}>
                          <Td darkMode={darkMode} align="left">{r.date ? formatDate(r.date) : '—'}</Td>
                          <Td darkMode={darkMode} bold align="left" className="hidden sm:table-cell">{r.unitName || '—'}</Td>
                          <Td darkMode={darkMode}>{formatKm(r.kilometers ?? 0)}</Td>
                          <Td darkMode={darkMode}>{formatHours(r.totalHours ?? 0)}</Td>
                          <Td darkMode={darkMode} className="hidden sm:table-cell">{formatHours(r.movingHours ?? 0)}</Td>
                          <Td darkMode={darkMode} className="hidden md:table-cell">{formatHours(r.idleHours ?? 0)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={`border-t ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
                  <Pagination page={page} totalItems={rows.length} pageSize={pageSize}
                    onPageSizeChange={setPageSize} onPageChange={setPage} />
                </div>
              </>
            )
        )}

        {activeTab === 'log' && (
          events.length === 0
            ? <Empty darkMode={darkMode} text="Sin eventos en el periodo seleccionado." />
            : (
              <>
                <div className="relative px-4 py-4">
                  <div className={`absolute left-[27px] top-6 bottom-6 w-px ${darkMode ? 'bg-[#222]' : 'bg-gray-200'}`} />
                  <div className="space-y-3.5">
                    {pagedEvents.map((evt: any, i: number) => {
                      const m = eventMeta(evt.type);
                      return (
                        <div key={evt.id || i} className="relative flex items-start gap-3">
                          <span className="relative z-10 mt-1 w-2 h-2 rounded-full flex-shrink-0 ring-4"
                            style={{ background: m.dot, '--tw-ring-color': darkMode ? '#111' : '#fff' } as React.CSSProperties} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{m.label}</p>
                            <p className={`text-[11.5px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {evt.unitName}{evt.details ? ` — ${evt.details}` : ''}
                            </p>
                          </div>
                          <span className={`text-[11px] tabular-nums flex-shrink-0 pt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {formatDateTime(evt.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={`border-t ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
                  <Pagination page={page} totalItems={events.length} pageSize={pageSize}
                    onPageSizeChange={setPageSize} onPageChange={setPage} />
                </div>
              </>
            )
        )}
      </div>
      <div className={`lg:hidden fixed bottom-0 inset-x-0 z-[1050] px-3 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-xl border-t flex gap-2
        ${darkMode ? 'bg-[#0a0a0a]/90 border-[#222]' : 'bg-white/90 border-gray-200'}`}>
        <MAction darkMode={darkMode} onClick={handleExportExcel} icon={FileSpreadsheet} label="Excel" />
        <MAction darkMode={darkMode} onClick={() => handleExportPdf()} icon={Download} label="PDF" />
        <MAction darkMode={darkMode} onClick={() => handleNativeShare('pdf')} icon={Share2} label="Compartir" primary />
        <IconBtn darkMode={darkMode} onClick={handleShareWhatsApp} icon={MessageCircle} title="WhatsApp" />
        <IconBtn darkMode={darkMode} onClick={handleShareEmail} icon={Mail} title="Correo" />
      </div>
    </div>
  );
}

function Th({ children, darkMode, align, className = '' }: {
  children: React.ReactNode; darkMode: boolean; align?: 'left'; className?: string;
}) {
  return (
    <th className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b
      ${align === 'left' ? 'text-left' : 'text-right'} ${className}
      ${darkMode ? 'text-gray-500 border-[#222]' : 'text-gray-400 border-gray-100'}`}>
      {children}
    </th>
  );
}

function Td({ children, darkMode, bold, align, className = '' }: {
  children: React.ReactNode; darkMode: boolean; bold?: boolean; align?: 'left'; className?: string;
}) {
  return (
    <td className={`px-3 py-2.5 border-b
      ${align === 'left' ? 'text-left' : 'text-right'}
      ${bold ? `font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}` : darkMode ? 'text-gray-300' : 'text-gray-600'}
      ${darkMode ? 'border-[#222]' : 'border-gray-50'} ${className}`}>
      {children}
    </td>
  );
}

function Empty({ darkMode, text }: { darkMode: boolean; text: string }) {
  return (
    <div className={`text-center py-14 px-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
      <FileText className="w-7 h-7 mx-auto mb-2 opacity-40" />
      <p className="text-[13px]">{text}</p>
    </div>
  );
}

function ActionBtn({ darkMode, onClick, icon: Icon, label }: {
  darkMode: boolean; onClick: () => void; icon: any; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors
        ${darkMode ? 'border-[#333] text-gray-200 hover:bg-[#1a1a1a]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function IconBtn({ darkMode, onClick, icon: Icon, title }: {
  darkMode: boolean; onClick: () => void; icon: any; title: string;
}) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={`p-2 rounded-lg border transition-colors
        ${darkMode ? 'border-[#333] text-gray-300 hover:bg-[#1a1a1a]' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

function MAction({ darkMode, onClick, icon: Icon, label, primary }: {
  darkMode: boolean; onClick: () => void; icon: any; label: string; primary?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-semibold transition-colors active:scale-[0.98]
        ${primary
          ? 'bg-[#032347] text-white'
          : darkMode ? 'bg-[#1a1a1a] text-gray-200' : 'bg-[#f5f5f7] text-gray-800'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
