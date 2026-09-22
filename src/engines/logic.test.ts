import { describe, expect, it } from 'vitest'
import { buildTruthTable, classifyTruthTable, evaluateExpression, expressionsEquivalent, parseExpression } from './logic'

describe('logic engine', () => {
  it('respects precedence and evaluates an implication', () => {
    const expression = parseExpression('p ∧ q → r')
    expect(evaluateExpression(expression, { p: true, q: true, r: false })).toBe(false)
    expect(evaluateExpression(expression, { p: false, q: true, r: false })).toBe(true)
  })

  it('classifies complete truth tables', () => {
    expect(classifyTruthTable(buildTruthTable(parseExpression('p ∨ ¬p')))).toBe('tautologia')
    expect(classifyTruthTable(buildTruthTable(parseExpression('p ∧ ¬p')))).toBe('contradição')
    expect(classifyTruthTable(buildTruthTable(parseExpression('p → q')))).toBe('contingência')
  })

  it('verifies semantic equivalence', () => {
    expect(expressionsEquivalent(parseExpression('p → q'), parseExpression('¬p ∨ q'))).toBe(true)
  })
})
