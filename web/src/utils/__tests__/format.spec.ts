import { describe, expect, it } from 'vitest'
import { formatMonth, formatNumber, formatPct } from '../format'

describe('format', () => {
  it('formats periods as short UK months', () => {
    expect(formatMonth('2026-07-01')).toBe('Jul 2026')
    expect(formatMonth('2025-01-01')).toBe('Jan 2025')
    expect(formatMonth('2025-09-01')).toBe('Sep 2025')
  })

  it('formats numbers and percentages', () => {
    expect(formatNumber(7162692)).toBe('7,162,692')
    expect(formatPct(0.67807)).toBe('67.8%')
    expect(formatPct(0.92, 0)).toBe('92%')
    expect(formatPct(null)).toBe('–')
  })
})
