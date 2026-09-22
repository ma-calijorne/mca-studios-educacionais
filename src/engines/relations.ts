import type { AnalysisResult, Evidence } from '../core/types'

export interface Pair {
  from: string
  to: string
}

export interface RelationAnalysis {
  domain: string[]
  image: string[]
  reflexive: AnalysisResult
  symmetric: AnalysisResult
  antisymmetric: AnalysisResult
  transitive: AnalysisResult
  equivalence: AnalysisResult
}

const key = (from: string, to: string) => `${from}→${to}`

export function analyzeRelation(elements: string[], pairs: Pair[]): RelationAnalysis {
  const relation = new Set(pairs.map((pair) => key(pair.from, pair.to)))
  const missingLoops = elements.filter((item) => !relation.has(key(item, item)))
  const missingReverse = pairs.filter(
    (pair) => pair.from !== pair.to && !relation.has(key(pair.to, pair.from)),
  )
  const reciprocalViolations = pairs.filter(
    (pair, index) =>
      pair.from !== pair.to &&
      relation.has(key(pair.to, pair.from)) &&
      pairs.findIndex((candidate) => candidate.from === pair.to && candidate.to === pair.from) > index,
  )

  const transitiveViolations: Array<{ first: Pair; second: Pair; missing: Pair }> = []
  for (const first of pairs) {
    for (const second of pairs) {
      if (first.to === second.from && !relation.has(key(first.from, second.to))) {
        const violation = {
          first,
          second,
          missing: { from: first.from, to: second.to },
        }
        if (
          !transitiveViolations.some(
            (current) =>
              current.first.from === violation.first.from &&
              current.first.to === violation.first.to &&
              current.second.to === violation.second.to,
          )
        ) {
          transitiveViolations.push(violation)
        }
      }
    }
  }

  const evidence = (items: Evidence[]): Evidence[] => items
  const reflexiveValue = missingLoops.length === 0
  const symmetricValue = missingReverse.length === 0
  const antisymmetricValue = reciprocalViolations.length === 0
  const transitiveValue = transitiveViolations.length === 0

  return {
    domain: [...new Set(pairs.map((pair) => pair.from))],
    image: [...new Set(pairs.map((pair) => pair.to))],
    reflexive: {
      id: 'reflexive',
      label: 'Reflexiva',
      value: reflexiveValue,
      summary: reflexiveValue
        ? `Todos os ${elements.length} elementos possuem laço.`
        : `${missingLoops.length} ${missingLoops.length === 1 ? 'elemento não possui' : 'elementos não possuem'} laço.`,
      evidence: evidence(
        reflexiveValue
          ? [{ id: 'reflexive-covered', kind: 'coverage', title: 'Cobertura completa', explanation: `Foram verificados ${elements.length} laços.`, refs: elements.map((item) => key(item, item)) }]
          : missingLoops.map((item) => ({ id: `loop-${item}`, kind: 'missing', title: `Falta ${item}→${item}`, explanation: `${item} não está relacionado consigo mesmo.`, refs: [key(item, item)] })),
      ),
    },
    symmetric: {
      id: 'symmetric',
      label: 'Simétrica',
      value: symmetricValue,
      summary: symmetricValue
        ? 'Toda seta possui a seta inversa.'
        : `${missingReverse.length} ${missingReverse.length === 1 ? 'seta está' : 'setas estão'} sem inversa.`,
      evidence: evidence(
        symmetricValue
          ? [{ id: 'symmetric-covered', kind: 'coverage', title: 'Nenhuma seta órfã', explanation: `As ${pairs.length} setas foram verificadas.`, refs: pairs.map((pair) => key(pair.from, pair.to)) }]
          : missingReverse.map((pair) => ({ id: `reverse-${key(pair.from, pair.to)}`, kind: 'counterexample', title: `${pair.from}→${pair.to} não possui volta`, explanation: `Existe ${pair.from}→${pair.to}, mas não existe ${pair.to}→${pair.from}.`, refs: [key(pair.from, pair.to), key(pair.to, pair.from)] })),
      ),
    },
    antisymmetric: {
      id: 'antisymmetric',
      label: 'Antissimétrica',
      value: antisymmetricValue,
      summary: antisymmetricValue
        ? 'Não há reciprocidade entre elementos distintos.'
        : `${reciprocalViolations.length} ${reciprocalViolations.length === 1 ? 'dupla viola' : 'duplas violam'} a condição.`,
      evidence: evidence(
        antisymmetricValue
          ? [{ id: 'antisymmetric-covered', kind: 'coverage', title: 'Nenhuma reciprocidade proibida', explanation: 'Laços são permitidos; somente elementos distintos foram comparados.' }]
          : reciprocalViolations.map((pair) => ({ id: `reciprocal-${key(pair.from, pair.to)}`, kind: 'violation', title: `${pair.from} e ${pair.to} possuem ida e volta`, explanation: `${pair.from}≠${pair.to}, mas as duas setas existem.`, refs: [key(pair.from, pair.to), key(pair.to, pair.from)] })),
      ),
    },
    transitive: {
      id: 'transitive',
      label: 'Transitiva',
      value: transitiveValue,
      summary: transitiveValue
        ? 'Toda cadeia de duas etapas possui ligação direta.'
        : `${transitiveViolations.length} ${transitiveViolations.length === 1 ? 'cadeia está' : 'cadeias estão'} incompleta.`,
      evidence: evidence(
        transitiveValue
          ? [{ id: 'transitive-covered', kind: 'coverage', title: 'Nenhuma cadeia incompleta', explanation: 'Todas as cadeias de duas etapas foram verificadas.' }]
          : transitiveViolations.map(({ first, second, missing }) => ({ id: `chain-${key(first.from, first.to)}-${second.to}`, kind: 'counterexample', title: `Falta ${missing.from}→${missing.to}`, explanation: `Existem ${first.from}→${first.to} e ${second.from}→${second.to}, mas não existe ${missing.from}→${missing.to}.`, refs: [key(first.from, first.to), key(second.from, second.to), key(missing.from, missing.to)] })),
      ),
    },
    equivalence: {
      id: 'equivalence',
      label: 'Equivalência',
      value: reflexiveValue && symmetricValue && transitiveValue,
      summary:
        reflexiveValue && symmetricValue && transitiveValue
          ? 'É reflexiva, simétrica e transitiva.'
          : 'Ainda não satisfaz simultaneamente reflexividade, simetria e transitividade.',
      evidence: [],
    },
  }
}
