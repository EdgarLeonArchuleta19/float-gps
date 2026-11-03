import { Linking, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export interface ExportTable {
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
}

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function tableHtml(table: ExportTable) {
  const head = table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const body = table.rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f;padding:24px;}
h1{color:#032347;font-size:20px;margin:0 0 4px;}
p{color:#6b7280;font-size:12px;margin:0 0 16px;}
table{width:100%;border-collapse:collapse;font-size:11px;}
th{background:#032347;color:#fff;text-align:left;padding:8px;}
td{padding:8px;border-bottom:1px solid #e5e5e5;}
.brand{color:#f87203;font-weight:700;}
</style></head><body>
<h1>${escapeHtml(table.title)}</h1><p><span class="brand">floaGPS</span> · ${escapeHtml(table.subtitle)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function csv(table: ExportTable) {
  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return '﻿' + [table.columns, ...table.rows].map((r) => r.map(quote).join(',')).join('\r\n');
}

function fileName(table: ExportTable, ext: string) {
  return `${table.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${ext}`;
}

export async function exportPdf(table: ExportTable) {
  const html = tableHtml(table);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: table.title });
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
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: table.title });
}

function summaryText(table: ExportTable) {
  const lines = table.rows.slice(0, 20).map((r) => `• ${r.join(' · ')}`);
  return `${table.title} (${table.subtitle})\n${table.columns.join(' · ')}\n${lines.join('\n')}${
    table.rows.length > 20 ? `\n…y ${table.rows.length - 20} más` : ''
  }\n\nGenerado con floaGPS`;
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
