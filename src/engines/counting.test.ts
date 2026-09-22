import { describe, expect, it } from 'vitest'
import {
  analyzePassword,
  arrangement,
  cartesianProduct,
  combination,
  factorial,
  permutationWithRepetition,
  productRule,
  sumRule,
} from './counting'

describe('counting engine', () => {
  it('applies the product and sum principles', () => {
    expect(productRule([3, 2, 2])).toBe(12n)
    expect(sumRule([30, 20])).toBe(50n)
  })

  it('calculates factorials and ordered selections', () => {
    expect(factorial(0)).toBe(1n)
    expect(factorial(5)).toBe(120n)
    expect(arrangement(5, 2)).toBe(20n)
    expect(arrangement(2, 3)).toBe(0n)
  })

  it('calculates combinations without order', () => {
    expect(combination(5, 2)).toBe(10n)
    expect(combination(52, 5)).toBe(2_598_960n)
  })

  it('removes equivalent permutations caused by repetition', () => {
    expect(permutationWithRepetition([2, 1])).toBe(3n)
    expect(permutationWithRepetition([2, 2])).toBe(6n)
  })

  it('models password restrictions', () => {
    expect(analyzePassword({ letterPositions: 3, digitPositions: 2, allowRepetition: true, noLeadingZero: false }).total).toBe(1_757_600n)
    expect(analyzePassword({ letterPositions: 0, digitPositions: 4, allowRepetition: true, noLeadingZero: true }).total).toBe(9_000n)
    expect(analyzePassword({ letterPositions: 3, digitPositions: 0, allowRepetition: false, noLeadingZero: false }).total).toBe(15_600n)
  })

  it('enumerates only a safe sample of a cartesian product', () => {
    const result = cartesianProduct([['A', 'B'], ['1', '2'], ['x', 'y']], 5)
    expect(result.total).toBe(8n)
    expect(result.rows).toHaveLength(5)
    expect(result.rows[0]).toEqual(['A', '1', 'x'])
    expect(result.truncated).toBe(true)
  })
})
