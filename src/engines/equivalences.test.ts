import { describe, expect, it } from 'vitest'
import { findTransformations } from './equivalences'
import { expressionsEquivalent, parseExpression } from './logic'

describe('equivalence rewrite engine', () => {
  it('offers De Morgan and only semantic-preserving rewrites', () => {
    const expression = parseExpression('¬(p ∧ q)')
    const candidates = findTransformations(expression)
    expect(candidates.some((candidate) => candidate.law === 'De Morgan')).toBe(true)
    expect(candidates.every((candidate) => expressionsEquivalent(expression, candidate.expression))).toBe(true)
  })

  it('simplifies a double negation', () => {
    const candidates = findTransformations(parseExpression('¬¬p'))
    expect(candidates.some((candidate) => candidate.law === 'Dupla negação' && candidate.after === 'p')).toBe(true)
  })
})
