import { describe, expect, it } from 'vitest'
import { aboutSheet, periodToDate, safeFileName, tableSheet, XLSX_FORMAT, type XlsxColumn } from '../xlsx'

type Row = { period: string; waiting: number; pct: number | null; name: string }
const columns: XlsxColumn<Row>[] = [
  { header: 'Month', value: (r) => periodToDate(r.period), format: XLSX_FORMAT.month },
  { header: 'Waiting list', value: (r) => r.waiting, format: XLSX_FORMAT.count, width: 20 },
  { header: '% within 18 weeks', value: (r) => r.pct, format: XLSX_FORMAT.pct },
  { header: 'Name', value: (r) => r.name },
]

describe('xlsx', () => {
  it('reads periods as UTC dates, so they never shift a day', () => {
    expect(periodToDate('2026-07-01').toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })

  it('writes a bold, frozen header row then typed, formatted cells', () => {
    const sheet = tableSheet('Monthly figures', [{ period: '2026-07-01', waiting: 88602, pct: 0.678, name: 'A' }], columns)

    expect(sheet.sheet).toBe('Monthly figures')
    expect(sheet.stickyRowsCount).toBe(1)
    expect(sheet.data[0]).toEqual(columns.map((c) => ({ value: c.header, fontWeight: 'bold' })))
    expect(sheet.data[1]).toEqual([
      { value: new Date('2026-07-01T00:00:00Z'), type: Date, format: 'mmm yyyy' },
      { value: 88602, type: Number, format: '#,##0' },
      { value: 0.678, type: Number, format: '0.0%' },
      { value: 'A', type: String },
    ])
  })

  it('leaves missing values empty rather than zero', () => {
    const sheet = tableSheet('S', [{ period: '2026-07-01', waiting: 0, pct: null, name: 'A' }], columns)
    expect(sheet.data[1]![1]).toEqual({ value: 0, type: Number, format: '#,##0' })
    expect(sheet.data[1]![2]).toBeNull()
  })

  it('sizes columns to fit their headers unless a width is given', () => {
    const sheet = tableSheet('S', [], columns)
    expect(sheet.columns).toEqual([{ width: 12 }, { width: 20 }, { width: 19 }, { width: 12 }])
  })

  it('writes label / value pairs for the About sheet', () => {
    expect(aboutSheet([['Organisation', 'A01']]).data).toEqual([[{ value: 'Organisation', fontWeight: 'bold' }, 'A01']])
  })

  it('removes characters Windows file names cannot contain', () => {
    expect(safeFileName('Summary A01 Ear, Nose/Throat: all.xlsx')).toBe('Summary A01 Ear, Nose-Throat- all.xlsx')
  })
})
