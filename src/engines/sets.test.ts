import { describe, expect, it } from 'vitest'
import { calculateSetOperation, type SetScenario } from './sets'

const scenario: SetScenario = { universe: ['1', '2', '3', '4'], a: ['1', '2'], b: ['2', '3'], c: [] }

describe('set engine', () => {
  it('calculates fundamental operations', () => {
    expect(calculateSetOperation(scenario, 'union')).toEqual(['1', '2', '3'])
    expect(calculateSetOperation(scenario, 'intersection')).toEqual(['2'])
    expect(calculateSetOperation(scenario, 'a-minus-b')).toEqual(['1'])
    expect(calculateSetOperation(scenario, 'complement-a')).toEqual(['3', '4'])
  })

  it('builds cartesian and power sets', () => {
    expect(calculateSetOperation(scenario, 'cartesian')).toHaveLength(4)
    expect(calculateSetOperation(scenario, 'power')).toHaveLength(4)
  })
})
