export type SetOperation =
  | 'union'
  | 'intersection'
  | 'a-minus-b'
  | 'b-minus-a'
  | 'complement-a'
  | 'cartesian'
  | 'power'

export interface SetScenario {
  universe: string[]
  a: string[]
  b: string[]
  c: string[]
}

const unique = (items: string[]) => [...new Set(items)]

export function calculateSetOperation(
  scenario: SetScenario,
  operation: SetOperation,
): string[] {
  const a = new Set(scenario.a)
  const b = new Set(scenario.b)
  switch (operation) {
    case 'union':
      return unique([...scenario.a, ...scenario.b])
    case 'intersection':
      return scenario.a.filter((item) => b.has(item))
    case 'a-minus-b':
      return scenario.a.filter((item) => !b.has(item))
    case 'b-minus-a':
      return scenario.b.filter((item) => !a.has(item))
    case 'complement-a':
      return scenario.universe.filter((item) => !a.has(item))
    case 'cartesian':
      return scenario.a.flatMap((left) => scenario.b.map((right) => `(${left}, ${right})`))
    case 'power': {
      const result: string[] = []
      const source = scenario.a
      for (let mask = 0; mask < 2 ** source.length; mask += 1) {
        result.push(`{${source.filter((_, index) => mask & (1 << index)).join(', ')}}`)
      }
      return result
    }
  }
}

export function explainSetItem(
  item: string,
  scenario: SetScenario,
  operation: SetOperation,
): string {
  const inA = scenario.a.includes(item)
  const inB = scenario.b.includes(item)
  const descriptions: Record<Exclude<SetOperation, 'cartesian' | 'power'>, string> = {
    union: `${item} ${inA || inB ? 'aparece' : 'não aparece'} porque pertence a ${inA && inB ? 'A e B' : inA ? 'A' : inB ? 'B' : 'nenhum dos conjuntos'}.`,
    intersection: `${item} ${inA && inB ? 'aparece' : 'não aparece'} porque ${inA && inB ? 'pertence aos dois conjuntos' : 'não pertence simultaneamente a A e B'}.`,
    'a-minus-b': `${item} ${inA && !inB ? 'aparece' : 'não aparece'} porque ${inA && !inB ? 'pertence a A e não pertence a B' : 'não está exclusivamente em A'}.`,
    'b-minus-a': `${item} ${inB && !inA ? 'aparece' : 'não aparece'} porque ${inB && !inA ? 'pertence a B e não pertence a A' : 'não está exclusivamente em B'}.`,
    'complement-a': `${item} ${!inA ? 'aparece' : 'não aparece'} porque ${!inA ? 'está no universo e fora de A' : 'pertence a A'}.`,
  }
  return operation === 'cartesian'
    ? 'Cada item do resultado combina uma origem de A com um destino de B; a ordem importa.'
    : operation === 'power'
      ? 'O conjunto potência reúne todos os subconjuntos possíveis de A.'
      : descriptions[operation]
}
