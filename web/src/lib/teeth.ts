// Dental chart layout in FDI notation (CR-011, CR-023).
// Rows are drawn as the dentist faces the patient: the patient's right is on the left.

export type Dentition = 'permanent' | 'primary'

type Row = [right: string[], left: string[]]

const range = (quadrant: number, count: number, descending: boolean) => {
  const teeth = Array.from({ length: count }, (_, i) => `${quadrant}${i + 1}`)
  return descending ? teeth.reverse() : teeth
}

export const CHART_ROWS: Record<Dentition, { upper: Row; lower: Row }> = {
  permanent: {
    upper: [range(1, 8, true), range(2, 8, false)],
    lower: [range(4, 8, true), range(3, 8, false)],
  },
  primary: {
    upper: [range(5, 5, true), range(6, 5, false)],
    lower: [range(8, 5, true), range(7, 5, false)],
  },
}

export function dentitionOf(tooth: string): Dentition {
  return Number(tooth[0]) >= 5 ? 'primary' : 'permanent'
}

/** Black or white text, whichever reads better on the given #RRGGBB background. */
export function textColorOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.4 ? '#0f1f1d' : '#ffffff'
}

/** One color fills the tooth; several split it into equal vertical bands. */
export function toothBackground(colors: string[]): string | undefined {
  if (colors.length === 0) return undefined
  if (colors.length === 1) return colors[0]
  const step = 100 / colors.length
  const stops = colors.map((color, i) => `${color} ${i * step}% ${(i + 1) * step}%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
