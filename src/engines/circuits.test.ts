import { describe, expect, it } from 'vitest'
import {
  analyzeCircuitSelection,
  circuitExpression,
  evaluateCircuit,
  evaluateGate,
  wouldCreateCycle,
  type CircuitConnection,
  type CircuitElement,
  type GateKind,
} from './circuits'

describe('digital circuit gates', () => {
  const expected: Record<Exclude<GateKind, 'NOT'>, Array<0 | 1>> = {
    AND: [0, 0, 0, 1],
    OR: [0, 1, 1, 1],
    XOR: [0, 1, 1, 0],
    NAND: [1, 1, 1, 0],
    NOR: [1, 0, 0, 0],
    XNOR: [1, 0, 0, 1],
  }

  for (const [gate, results] of Object.entries(expected) as Array<[Exclude<GateKind, 'NOT'>, Array<0 | 1>]>) {
    it(`evaluates ${gate}`, () => {
      expect([[0, 0], [0, 1], [1, 0], [1, 1]].map((inputs) => evaluateGate(gate, inputs as Array<0 | 1>))).toEqual(results)
    })
  }

  it('propagates unknown values without losing controlling values', () => {
    expect(evaluateGate('AND', [0, 'X'])).toBe(0)
    expect(evaluateGate('OR', [1, 'X'])).toBe(1)
    expect(evaluateGate('XOR', [1, 'X'])).toBe('X')
    expect(evaluateGate('NOT', ['X'])).toBe('X')
  })
})

describe('circuit evaluation', () => {
  const elements: CircuitElement[] = [
    { id: 'A', kind: 'input', label: 'A', inputValue: 1 },
    { id: 'B', kind: 'input', label: 'B', inputValue: 1 },
    { id: 'G1', kind: 'gate', label: 'AND', gate: 'AND' },
    { id: 'G2', kind: 'gate', label: 'NOT', gate: 'NOT' },
    { id: 'Y', kind: 'output', label: 'Y' },
  ]
  const connections: CircuitConnection[] = [
    { id: 'a', source: 'A', target: 'G1', targetPort: 'in-0' },
    { id: 'b', source: 'B', target: 'G1', targetPort: 'in-1' },
    { id: 'c', source: 'G1', target: 'G2', targetPort: 'in-0' },
    { id: 'd', source: 'G2', target: 'Y', targetPort: 'in-0' },
  ]

  it('propagates a signal through several gates', () => {
    const result = evaluateCircuit(elements, connections)
    expect(result.nodeValues).toMatchObject({ A: 1, B: 1, G1: 1, G2: 0, Y: 0 })
    expect(result.wireValues.d).toBe(0)
    expect(result.trace.map((step) => step.nodeId)).toEqual(['G1', 'G2', 'Y'])
  })

  it('generates the Boolean expression for an output', () => {
    expect(circuitExpression(elements, connections, 'Y')).toBe('¬(A ∧ B)')
  })

  it('reports floating ports and cycles', () => {
    const floating = evaluateCircuit(elements, connections.filter((wire) => wire.id !== 'b'))
    expect(floating.nodeValues.Y).toBe('X')
    expect(floating.diagnostics.some((item) => item.id === 'floating-G1-1')).toBe(true)

    const cyclic = evaluateCircuit(
      elements,
      [...connections.filter((wire) => wire.id !== 'b'), { id: 'cycle', source: 'G2', target: 'G1', targetPort: 'in-1' }],
    )
    expect(cyclic.diagnostics.some((item) => item.title === 'Ciclo combinacional detectado')).toBe(true)
  })

  it('detects a cycle before adding a connection', () => {
    expect(wouldCreateCycle(connections, 'G2', 'G1')).toBe(true)
    expect(wouldCreateCycle(connections, 'A', 'Y')).toBe(false)
  })

  it('builds a truth table for a selected subcircuit', () => {
    const analysis = analyzeCircuitSelection(elements, connections, ['G1', 'G2'])
    expect(analysis.valid).toBe(true)
    expect(analysis.inputs.map((input) => input.label)).toEqual(['A', 'B'])
    expect(analysis.rows.map((row) => row.values.G2)).toEqual([1, 1, 1, 0])
    expect(analysis.expressions.G2).toBe('¬(A ∧ B)')
  })

  it('creates virtual inputs when an isolated gate is selected', () => {
    const analysis = analyzeCircuitSelection([{ id: 'X1', kind: 'gate', label: 'XOR', gate: 'XOR' }], [], ['X1'])
    expect(analysis.inputs).toHaveLength(2)
    expect(analysis.rows.map((row) => row.values.X1)).toEqual([0, 1, 1, 0])
  })
})
