import { Linking, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { formatDateTime } from './format';
import { MAKER_BRAND } from './brand';

export interface ExportHighlight {
  label: string;
  value: string;
}

export interface ExportTable {
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
  numeric?: boolean[];
  totals?: (string | number)[];
  highlights?: ExportHighlight[];
  company?: string | null;
  author?: string | null;
}

const A4_PORTRAIT = { width: 595, height: 842 };
const A4_LANDSCAPE = { width: 842, height: 595 };

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function isLandscape(table: ExportTable) {
  return table.columns.length > 5;
}

function cell(tag: 'th' | 'td', value: string | number, numeric?: boolean) {
  return `<${tag}${numeric ? ' class="num"' : ''}>${escapeHtml(value)}</${tag}>`;
}

function reportHtml(table: ExportTable) {
  const numeric = table.numeric || [];
  const head = table.columns.map((c, i) => cell('th', c, numeric[i])).join('');
  const body = table.rows.map((r) => `<tr>${r.map((v, i) => cell('td', v, numeric[i])).join('')}</tr>`).join('');
  const foot = table.totals ? `<tfoot><tr>${table.totals.map((v, i) => cell('td', v, numeric[i])).join('')}</tr></tfoot>` : '';
  const kpis = table.highlights?.length
    ? `<div class="kpis">${table.highlights.map((h) => `<div class="kpi"><small>${escapeHtml(h.label)}</small><b>${escapeHtml(h.value)}</b></div>`).join('')}</div>`
    : '';
  const content = table.rows.length
    ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`
    : '<div class="empty">No hay datos para el periodo seleccionado.</div>';
  const generated = `Generado el ${escapeHtml(formatDateTime(new Date()))}${table.author ? ` por ${escapeHtml(table.author)}` : ''}`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${escapeHtml(table.title)}</title><style>
@page{size:A4 ${isLandscape(table) ? 'landscape' : 'portrait'};margin:14mm 12mm;}
*{box-sizing:border-box;}
body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:3px solid #032347;padding-bottom:10px;margin-bottom:14px;}
.brand{font-size:21px;font-weight:800;color:#032347;letter-spacing:-0.3px;}
.brand span{color:#f87203;}
.company{font-size:12px;color:#4b5563;margin-top:2px;}
.meta{text-align:right;}
.meta h1{margin:0;font-size:17px;color:#032347;}
.meta p{margin:3px 0 0;font-size:11px;color:#6b7280;}
.kpis{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.kpi{flex:1 1 0;min-width:90px;border:1px solid #e5e5e5;border-radius:8px;padding:8px 10px;}
.kpi small{display:block;font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;}
.kpi b{display:block;margin-top:2px;font-size:15px;color:#032347;}
table{width:100%;border-collapse:collapse;}
thead{display:table-header-group;}
th{background:#032347;color:#fff;text-align:left;padding:7px 8px;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;}
td{padding:6px 8px;border-bottom:1px solid #ececec;}
tbody tr:nth-child(even) td{background:#f7f7f9;}
tr{page-break-inside:avoid;}
.num{text-align:right;font-variant-numeric:tabular-nums;}
tfoot td{font-weight:700;border-top:2px solid #032347;border-bottom:0;}
.empty{padding:28px;text-align:center;color:#6b7280;border:1px dashed #d1d5db;border-radius:8px;}
.footer{margin-top:14px;display:flex;justify-content:space-between;font-size:9.5px;color:#9ca3af;}
</style></head><body>
<div class="header">
  <div><div class="brand">floa<span>GPS</span></div>${table.company ? `<div class="company">${escapeHtml(table.company)}</div>` : ''}</div>
  <div class="meta"><h1>${escapeHtml(table.title)}</h1><p>${escapeHtml(table.subtitle)}</p></div>
</div>
${kpis}
${content}
<div class="footer"><span>${generated}</span><span>floaGPS · ${MAKER_BRAND}</span></div>
</body></html>`;
}

function csv(table: ExportTable) {
  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = table.totals ? [...table.rows, table.totals] : table.rows;
  return '﻿' + [table.columns, ...rows].map((r) => r.map(quote).join(',')).join('\r\n');
}

function fileName(table: ExportTable, ext: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${table.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${stamp}.${ext}`;
}

function printOnWeb(html: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 60000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

export async function exportPdf(table: ExportTable) {
  const html = reportHtml(table);
  if (Platform.OS === 'web') {
    printOnWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, ...(isLandscape(table) ? A4_LANDSCAPE : A4_PORTRAIT) });
  const named = new File(Paths.cache, fileName(table, 'pdf'));
  if (named.exists) named.delete();
  new File(uri).move(named);
  await Sharing.shareAsync(named.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: table.title });
}

export async function exportSpreadsheet(table: ExportTable) {
  const content = csv(table);
  const name = fileName(table, 'csv');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: table.title });
}

function summaryText(table: ExportTable) {
  const highlights = table.highlights?.map((h) => `${h.label}: ${h.value}`).join(' · ');
  const lines = table.rows.slice(0, 20).map((r) => `• ${r.join(' · ')}`);
  return [
    `*${table.title}*${table.company ? ` · ${table.company}` : ''}`,
    table.subtitle,
    highlights,
    '',
    table.columns.join(' · '),
    ...lines,
    table.rows.length > 20 ? `…y ${table.rows.length - 20} más` : '',
    '',
    'Generado con floaGPS',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

async function openUrl(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else await Linking.openURL(url);
}

export function shareWhatsApp(table: ExportTable) {
  return openUrl(`https://wa.me/?text=${encodeURIComponent(summaryText(table))}`);
}

export function shareEmail(table: ExportTable) {
  return openUrl(`mailto:?subject=${encodeURIComponent(`${table.title} · floaGPS`)}&body=${encodeURIComponent(summaryText(table))}`);
}
