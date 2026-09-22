import type { AnalysisResult } from '../core/types'
import type { Pair } from './relations'

export interface FunctionAnalysis {
  isFunction: AnalysisResult
  injective: AnalysisResult
  surjective: AnalysisResult
  bijective: AnalysisResult
  image: string[]
}

export function analyzeFunction(domain: string[], codomain: string[], pairs: Pair[]): FunctionAnalysis {
  const targetsBySource = new Map<string, string[]>()
  const sourcesByTarget = new Map<string, string[]>()
  for (const item of domain) targetsBySource.set(item, [])
  for (const item of codomain) sourcesByTarget.set(item, [])
  for (const pair of pairs) {
    targetsBySource.set(pair.from, [...(targetsBySource.get(pair.from) ?? []), pair.to])
    sourcesByTarget.set(pair.to, [...(sourcesByTarget.get(pair.to) ?? []), pair.from])
  }
  const missing = domain.filter((item) => (targetsBySource.get(item)?.length ?? 0) === 0)
  const multiple = domain.filter((item) => (targetsBySource.get(item)?.length ?? 0) > 1)
  const functionValue = missing.length === 0 && multiple.length === 0
  const collisions = codomain.filter((item) => (sourcesByTarget.get(item)?.length ?? 0) > 1)
  const uncovered = codomain.filter((item) => (sourcesByTarget.get(item)?.length ?? 0) === 0)
  const injectiveValue = functionValue && collisions.length === 0
  const surjectiveValue = functionValue && uncovered.length === 0

  const unavailable = (label: string): AnalysisResult => ({
    id: label.toLowerCase(),
    label,
    value: null,
    summary: 'Primeiro a relação precisa satisfazer a definição de função.',
    evidence: [],
  })

  return {
    image: codomain.filter((item) => (sourcesByTarget.get(item)?.length ?? 0) > 0),
    isFunction: {
      id: 'is-function',
      label: 'É função',
      value: functionValue,
      summary: functionValue
        ? 'Cada entrada possui exatamente uma saída.'
        : missing.length
          ? `${missing.join(', ')} ${missing.length === 1 ? 'não possui' : 'não possuem'} saída.`
          : `${multiple.join(', ')} ${multiple.length === 1 ? 'possui' : 'possuem'} mais de uma saída.`,
      evidence: [
        ...missing.map((item) => ({ id: `missing-${item}`, kind: 'missing' as const, title: `${item} sem saída`, explanation: 'Toda entrada precisa possuir uma saída.', refs: [item] })),
        ...multiple.map((item) => ({ id: `multiple-${item}`, kind: 'violation' as const, title: `${item} com múltiplas saídas`, explanation: 'Uma entrada não pode possuir duas saídas diferentes.', refs: [item] })),
      ],
    },
    injective: functionValue
      ? {
          id: 'injective',
          label: 'Injetora',
          value: injectiveValue,
          summary: injectiveValue ? 'Nenhuma saída é compartilhada.' : `Saídas compartilhadas: ${collisions.join(', ')}.`,
          evidence: collisions.map((item) => ({ id: `collision-${item}`, kind: 'violation', title: `Colisão em ${item}`, explanation: `${sourcesByTarget.get(item)?.join(' e ')} apontam para a mesma saída.`, refs: [item] })),
        }
      : unavailable('Injetora'),
    surjective: functionValue
      ? {
          id: 'surjective',
          label: 'Sobrejetora',
          value: surjectiveValue,
          summary: surjectiveValue ? 'Todo elemento do contradomínio foi atingido.' : `Não atingidos: ${uncovered.join(', ')}.`,
          evidence: uncovered.map((item) => ({ id: `uncovered-${item}`, kind: 'missing', title: `${item} não foi atingido`, explanation: 'Uma função sobrejetora precisa cobrir todo o contradomínio.', refs: [item] })),
        }
      : unavailable('Sobrejetora'),
    bijective: functionValue
      ? {
          id: 'bijective',
          label: 'Bijetora',
          value: injectiveValue && surjectiveValue,
          summary:
            injectiveValue && surjectiveValue
              ? 'É simultaneamente injetora e sobrejetora.'
              : 'Precisa ser injetora e sobrejetora ao mesmo tempo.',
          evidence: [],
        }
      : unavailable('Bijetora'),
  }
}
