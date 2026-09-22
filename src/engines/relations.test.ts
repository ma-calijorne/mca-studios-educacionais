import { describe, expect, it } from 'vitest'
import { analyzeFunction } from './functions'
import { analyzeRelation } from './relations'

describe('relation and function engines', () => {
  it('finds the missing edge in a transitive chain', () => {
    const result = analyzeRelation(['a', 'b', 'c'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }])
    expect(result.transitive.value).toBe(false)
    expect(result.transitive.evidence[0].title).toContain('a→c')
  })

  it('recognizes an equivalence relation', () => {
    const result = analyzeRelation(['a', 'b'], [
      { from: 'a', to: 'a' }, { from: 'b', to: 'b' },
      { from: 'a', to: 'b' }, { from: 'b', to: 'a' },
    ])
    expect(result.equivalence.value).toBe(true)
  })

  it('distinguishes function, injection and surjection', () => {
    const result = analyzeFunction(['a', 'b'], ['1', '2', '3'], [{ from: 'a', to: '1' }, { from: 'b', to: '2' }])
    expect(result.isFunction.value).toBe(true)
    expect(result.injective.value).toBe(true)
    expect(result.surjective.value).toBe(false)
  })
})
