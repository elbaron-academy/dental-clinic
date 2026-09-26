import { describe, expect, it } from 'vitest'
import { CHART_ROWS, dentitionOf, textColorOn, toothBackground } from './teeth'

describe('dental chart helpers (CR-011, CR-023)', () => {
  it('lays out FDI teeth as the dentist faces the patient', () => {
    expect(CHART_ROWS.permanent.upper).toEqual([
      ['18', '17', '16', '15', '14', '13', '12', '11'],
      ['21', '22', '23', '24', '25', '26', '27', '28'],
    ])
    expect(CHART_ROWS.permanent.lower[0][0]).toBe('48')
    expect(CHART_ROWS.permanent.lower[1].at(-1)).toBe('38')
    expect(CHART_ROWS.primary.upper).toEqual([
      ['55', '54', '53', '52', '51'],
      ['61', '62', '63', '64', '65'],
    ])
    expect(CHART_ROWS.primary.lower).toEqual([
      ['85', '84', '83', '82', '81'],
      ['71', '72', '73', '74', '75'],
    ])
  })

  it('tells permanent from primary teeth', () => {
    expect(dentitionOf('36')).toBe('permanent')
    expect(dentitionOf('55')).toBe('primary')
    expect(dentitionOf('85')).toBe('primary')
  })

  it('picks readable text on the tooth color', () => {
    expect(textColorOn('#2563EB')).toBe('#ffffff')
    expect(textColorOn('#475569')).toBe('#ffffff')
    expect(textColorOn('#FDE68A')).toBe('#0f1f1d')
  })

  it('fills one color or splits several into bands', () => {
    expect(toothBackground([])).toBeUndefined()
    expect(toothBackground(['#DC2626'])).toBe('#DC2626')
    expect(toothBackground(['#DC2626', '#2563EB'])).toBe('linear-gradient(90deg, #DC2626 0% 50%, #2563EB 50% 100%)')
  })
})
