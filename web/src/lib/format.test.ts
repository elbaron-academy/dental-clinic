import { describe, expect, it } from 'vitest'
import { formatMoney, localDayRange, nextQuarterHour, toDateTimeInput } from './format'

describe('format helpers', () => {
  it('formats decimal strings as money', () => {
    expect(formatMoney('250')).toMatch(/250[.,]00/)
    expect(formatMoney(null)).toBe('—')
  })

  it('computes the local day range as ISO strings', () => {
    const { from, to } = localDayRange(new Date(2026, 8, 25, 15, 30))
    expect(new Date(from).getTime()).toBe(new Date(2026, 8, 25).getTime())
    expect(new Date(to).getTime()).toBe(new Date(2026, 8, 26).getTime())
  })

  it('rounds up to the next quarter hour', () => {
    expect(toDateTimeInput(nextQuarterHour(new Date(2026, 0, 1, 9, 7)))).toBe('2026-01-01T09:15')
    expect(toDateTimeInput(nextQuarterHour(new Date(2026, 0, 1, 9, 59)))).toBe('2026-01-01T10:00')
  })
})
