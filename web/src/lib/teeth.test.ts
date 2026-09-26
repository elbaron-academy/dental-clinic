import { describe, expect, it } from 'vitest'
import { CHART_ROWS, colorBands, dentitionOf, isUpper, toothKind } from './teeth'

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

  it('knows the tooth type and jaw', () => {
    expect(['11', '12', '13', '14', '15', '16', '17', '18'].map(toothKind)).toEqual([
      'incisor', 'incisor', 'canine', 'premolar', 'premolar', 'molar', 'molar', 'molar',
    ])
    expect(['51', '52', '53', '54', '55'].map(toothKind)).toEqual(['incisor', 'incisor', 'canine', 'molar', 'molar'])
    expect(['18', '28', '55', '65'].every(isUpper)).toBe(true)
    expect(['38', '48', '75', '85'].some(isUpper)).toBe(false)
  })

  it('splits several colors into equal bands', () => {
    expect(colorBands(['#DC2626', '#2563EB'])).toEqual([
      { offset: '0%', color: '#DC2626' },
      { offset: '50%', color: '#DC2626' },
      { offset: '50%', color: '#2563EB' },
      { offset: '100%', color: '#2563EB' },
    ])
  })
})
