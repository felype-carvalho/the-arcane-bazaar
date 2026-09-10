export type CurrencyUnit = 'GP' | 'SP' | 'CP'

export interface CurrencyPart {
  unit: CurrencyUnit
  value: number
}

const MILLI_CP_PER_CP = 1_000
const MILLI_CP_PER_SP = 10 * MILLI_CP_PER_CP
const MILLI_CP_PER_GP = 10 * MILLI_CP_PER_SP

export class CurrencyConverter {
  static fromGp(valueGp: number): CurrencyPart[] {
    const totalMilliCp = this.toMilliCp(valueGp)
    if (totalMilliCp === 0) return [{ unit: 'GP', value: 0 }]

    const gp = Math.floor(totalMilliCp / MILLI_CP_PER_GP)
    const afterGp = totalMilliCp % MILLI_CP_PER_GP
    const sp = Math.floor(afterGp / MILLI_CP_PER_SP)
    const cp = (afterGp % MILLI_CP_PER_SP) / MILLI_CP_PER_CP
    const parts: CurrencyPart[] = []

    if (gp) parts.push({ unit: 'GP', value: gp })
    if (sp) parts.push({ unit: 'SP', value: sp })
    if (cp) parts.push({ unit: 'CP', value: cp })

    return parts
  }

  static normalizeGp(valueGp: number): number {
    return this.toMilliCp(valueGp) / MILLI_CP_PER_GP
  }

  private static toMilliCp(valueGp: number): number {
    if (!Number.isFinite(valueGp) || valueGp < 0) {
      throw new RangeError('Currency value must be a finite, non-negative number')
    }

    return Math.round(valueGp * MILLI_CP_PER_GP)
  }
}
