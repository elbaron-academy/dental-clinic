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

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'

/** Tooth type from its FDI position: 1–2 incisors, 3 canine, then premolars/molars. */
export function toothKind(tooth: string): ToothKind {
  const position = Number(tooth[1])
  if (position <= 2) return 'incisor'
  if (position === 3) return 'canine'
  if (dentitionOf(tooth) === 'primary') return 'molar'
  return position <= 5 ? 'premolar' : 'molar'
}

/** Upper jaw: quadrants 1, 2 (permanent) and 5, 6 (primary). */
export function isUpper(tooth: string): boolean {
  return ['1', '2', '5', '6'].includes(tooth[0])
}

/** Equal color bands for a tooth marked with several actions (SVG gradient stops). */
export function colorBands(colors: string[]): { offset: string; color: string }[] {
  const step = 100 / colors.length
  return colors.flatMap((color, i) => [
    { offset: `${i * step}%`, color },
    { offset: `${(i + 1) * step}%`, color },
  ])
}
