// Display formatting, UK style. Periods arrive as "YYYY-MM-DD" (first of the month);
// they're parsed as UTC so a browser outside the UK never shifts them to the day before.

const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const numberFormat = new Intl.NumberFormat('en-GB')

// Newer browsers write September as "Sept" in en-GB; "Sep" matches the other months and Excel.
export function formatMonth(period: string): string {
  return monthFormat.format(new Date(`${period.slice(0, 10)}T00:00:00Z`)).replace('Sept', 'Sep')
}

export function formatNumber(n: number): string {
  return numberFormat.format(n)
}

// 0.6781 -> "67.8%"
export function formatPct(fraction: number | null | undefined, digits = 1): string {
  return fraction == null ? '–' : `${(fraction * 100).toFixed(digits)}%`
}
