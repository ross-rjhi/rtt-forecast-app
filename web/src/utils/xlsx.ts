// Excel downloads, built in the browser from data the page already has (like Shiny's
// downloadHandler() + writexl, but no server round trip). Values go in as real numbers and
// dates with Excel formats, so they can be sorted, charted and summed straight away.
import type { Cell, Sheet } from 'write-excel-file/browser'

// Excel number formats: Excel shows the value this way, but keeps the underlying number.
export const XLSX_FORMAT = {
  month: 'mmm yyyy', // Jul 2026
  count: '#,##0', // 88,602
  pct: '0.0%', // 0.678 -> 67.8%
  decimal: '0.0', // 10.7
} as const

export interface XlsxColumn<T> {
  header: string
  value: (row: T) => string | number | Date | null | undefined
  format?: string
  width?: number // in characters
}

// "2026-07-01" -> a UTC Date, so it never shifts to the day before.
export function periodToDate(period: string): Date {
  return new Date(`${period.slice(0, 10)}T00:00:00Z`)
}

function cell(value: string | number | Date | null | undefined, format?: string): Cell {
  if (value == null) return null // an empty cell, not 0
  if (typeof value === 'number') return { value, type: Number, format }
  if (value instanceof Date) return { value, type: Date, format: format ?? XLSX_FORMAT.month }
  return { value, type: String }
}

// A table of rows: bold header row (frozen), then one row per record.
export function tableSheet<T>(name: string, rows: T[], columns: XlsxColumn<T>[]): Sheet<Blob> {
  return {
    sheet: name,
    data: [
      columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const })),
      ...rows.map((r) => columns.map((c) => cell(c.value(r), c.format))),
    ],
    columns: columns.map((c) => ({ width: c.width ?? Math.max(12, c.header.length + 2) })),
    stickyRowsCount: 1,
  }
}

// Label / value pairs, e.g. what was filtered and where the data came from.
export function aboutSheet(items: [label: string, value: string][]): Sheet<Blob> {
  return {
    sheet: 'About',
    data: items.map(([label, value]) => [{ value: label, fontWeight: 'bold' as const }, value]),
    columns: [{ width: 16 }, { width: 90 }],
  }
}

// Build and save the file. The library only loads on first use, keeping page load fast.
export async function downloadXlsx(fileName: string, sheets: Sheet<Blob>[]): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  await writeExcelFile(sheets).toFile(fileName)
}

// Characters Windows doesn't allow in file names.
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '-').trim()
}
