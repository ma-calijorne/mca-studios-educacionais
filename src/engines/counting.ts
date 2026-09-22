export type CountingPrinciple =
  | 'product'
  | 'sum'
  | 'permutation'
  | 'multiset-permutation'
  | 'arrangement'
  | 'combination'

export interface CountingAnalysis {
  principle: CountingPrinciple
  total: bigint
  formula: string
  explanation: string
  steps: string[]
}

export interface PasswordSpecification {
  letterPositions: number
  digitPositions: number
  allowRepetition: boolean
  noLeadingZero: boolean
}

export interface CartesianResult<T> {
  rows: T[][]
  total: bigint
  truncated: boolean
}

function assertWhole(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} deve ser um inteiro não negativo.`)
}

export function factorial(value: number): bigint {
  assertWhole(value, 'n')
  let result = 1n
  for (let factor = 2n; factor <= BigInt(value); factor += 1n) result *= factor
  return result
}

export function productRule(factors: readonly number[]): bigint {
  if (!factors.length) return 0n
  factors.forEach((factor) => assertWhole(factor, 'Cada fator'))
  return factors.reduce((total, factor) => total * BigInt(factor), 1n)
}

export function sumRule(terms: readonly number[]): bigint {
  terms.forEach((term) => assertWhole(term, 'Cada parcela'))
  return terms.reduce((total, term) => total + BigInt(term), 0n)
}

export function permutation(n: number): bigint {
  return factorial(n)
}

export function permutationWithRepetition(groups: readonly number[]): bigint {
  if (!groups.length) return 0n
  groups.forEach((group) => assertWhole(group, 'Cada multiplicidade'))
  const total = groups.reduce((sum, group) => sum + group, 0)
  const denominator = groups.reduce((result, group) => result * factorial(group), 1n)
  return factorial(total) / denominator
}

export function arrangement(n: number, k: number): bigint {
  assertWhole(n, 'n')
  assertWhole(k, 'k')
  if (k > n) return 0n
  let result = 1n
  for (let index = 0; index < k; index += 1) result *= BigInt(n - index)
  return result
}

export function combination(n: number, k: number): bigint {
  assertWhole(n, 'n')
  assertWhole(k, 'k')
  if (k > n) return 0n
  const smaller = Math.min(k, n - k)
  let result = 1n
  for (let index = 1; index <= smaller; index += 1) {
    result = (result * BigInt(n - smaller + index)) / BigInt(index)
  }
  return result
}

export function analyzeStages(kind: 'product' | 'sum', counts: readonly number[]): CountingAnalysis {
  const total = kind === 'product' ? productRule(counts) : sumRule(counts)
  const symbol = kind === 'product' ? ' × ' : ' + '
  return {
    principle: kind,
    total,
    formula: `${counts.join(symbol)} = ${total}`,
    explanation: kind === 'product'
      ? 'As escolhas acontecem em etapas sucessivas; cada caminho de uma etapa pode continuar por todas as opções da próxima.'
      : 'As alternativas são mutuamente exclusivas; escolhemos um caminho ou outro, sem sobreposição.',
    steps: counts.map((count, index) => kind === 'product'
      ? `Etapa ${index + 1}: ${count} possibilidade${count === 1 ? '' : 's'}.`
      : `Alternativa ${index + 1}: acrescenta ${count} possibilidade${count === 1 ? '' : 's'}.`),
  }
}

export function analyzeSelection(
  principle: Exclude<CountingPrinciple, 'product' | 'sum'>,
  n: number,
  k = n,
  groups: readonly number[] = [],
): CountingAnalysis {
  assertWhole(n, 'n')
  assertWhole(k, 'k')

  if (principle === 'permutation') {
    const total = permutation(n)
    return {
      principle,
      total,
      formula: `${n}! = ${total}`,
      explanation: 'Todos os elementos são usados e a ordem altera o resultado.',
      steps: [`Há ${n} escolhas para a primeira posição.`, 'A cada posição resta um elemento a menos.', `Multiplicamos até 1: ${n}!`],
    }
  }

  if (principle === 'multiset-permutation') {
    const multiplicities = groups.length ? groups : [n]
    const size = multiplicities.reduce((sum, value) => sum + value, 0)
    const total = permutationWithRepetition(multiplicities)
    return {
      principle,
      total,
      formula: `${size}! ÷ (${multiplicities.map((value) => `${value}!`).join(' × ')}) = ${total}`,
      explanation: 'Trocas entre elementos iguais não criam uma nova ordenação, por isso removemos as repetições.',
      steps: [`Ordenamos as ${size} posições.`, `Dividimos pelas repetições: ${multiplicities.join(', ')}.`],
    }
  }

  if (principle === 'arrangement') {
    const total = arrangement(n, k)
    return {
      principle,
      total,
      formula: `A(${n}, ${k}) = ${n}! ÷ (${n - k})! = ${total}`,
      explanation: 'Escolhemos apenas parte dos elementos e a ordem das posições importa.',
      steps: [`Escolhemos ${k} posições entre ${n} elementos.`, `Multiplicamos ${k} fatores decrescentes.`],
    }
  }

  const total = combination(n, k)
  return {
    principle,
    total,
    formula: `C(${n}, ${k}) = ${n}! ÷ (${k}! × ${n - k}!) = ${total}`,
    explanation: 'Escolhemos um subconjunto e a ordem dos elementos não cria uma nova seleção.',
    steps: [`Começamos pelas seleções ordenadas de ${k} elementos.`, `Dividimos pelas ${k}! ordens equivalentes.`],
  }
}

export function analyzePassword(specification: PasswordSpecification): CountingAnalysis {
  const { letterPositions, digitPositions, allowRepetition, noLeadingZero } = specification
  assertWhole(letterPositions, 'Quantidade de letras')
  assertWhole(digitPositions, 'Quantidade de dígitos')
  if (letterPositions > 26 && !allowRepetition) return analyzeStages('product', [0])
  if (digitPositions > 10 && !allowRepetition) return analyzeStages('product', [0])

  const factors: bigint[] = []
  const formulaParts: string[] = []
  const steps: string[] = []

  if (letterPositions > 0) {
    const letters = allowRepetition ? 26n ** BigInt(letterPositions) : arrangement(26, letterPositions)
    factors.push(letters)
    formulaParts.push(allowRepetition ? `26^${letterPositions}` : `A(26, ${letterPositions})`)
    steps.push(`${letterPositions} posição(ões) de letras: ${letters} possibilidades.`)
  }

  if (digitPositions > 0) {
    let digits: bigint
    let digitFormula: string
    if (noLeadingZero && letterPositions === 0) {
      digits = allowRepetition
        ? 9n * (10n ** BigInt(Math.max(0, digitPositions - 1)))
        : 9n * arrangement(9, Math.max(0, digitPositions - 1))
      digitFormula = allowRepetition
        ? `9 × 10^${Math.max(0, digitPositions - 1)}`
        : `9 × A(9, ${Math.max(0, digitPositions - 1)})`
      steps.push('A primeira posição tem 9 opções porque zero não é permitido no início.')
    } else {
      digits = allowRepetition ? 10n ** BigInt(digitPositions) : arrangement(10, digitPositions)
      digitFormula = allowRepetition ? `10^${digitPositions}` : `A(10, ${digitPositions})`
    }
    factors.push(digits)
    formulaParts.push(digitFormula)
    steps.push(`${digitPositions} posição(ões) de dígitos: ${digits} possibilidades.`)
  }

  const total = factors.length ? factors.reduce((result, factor) => result * factor, 1n) : 0n
  return {
    principle: 'product',
    total,
    formula: `${formulaParts.join(' × ') || '0'} = ${total}`,
    explanation: allowRepetition
      ? 'Cada posição é uma etapa e os símbolos podem voltar a aparecer.'
      : 'A ordem importa e, a cada posição, há um símbolo disponível a menos.',
    steps,
  }
}

export function cartesianProduct<T>(sets: readonly (readonly T[])[], limit = 120): CartesianResult<T> {
  if (!sets.length || sets.some((set) => set.length === 0)) return { rows: [], total: 0n, truncated: false }
  const total = sets.reduce((result, set) => result * BigInt(set.length), 1n)
  const rows: T[][] = []

  function visit(depth: number, prefix: T[]) {
    if (rows.length >= limit) return
    if (depth === sets.length) {
      rows.push(prefix)
      return
    }
    for (const value of sets[depth]) {
      visit(depth + 1, [...prefix, value])
      if (rows.length >= limit) break
    }
  }

  visit(0, [])
  return { rows, total, truncated: total > BigInt(rows.length) }
}

export function formatCount(value: bigint): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function estimateAttackTime(total: bigint, attemptsPerSecond: bigint): string {
  if (attemptsPerSecond <= 0n) return '—'
  const seconds = total / attemptsPerSecond
  if (seconds < 1n) return 'menos de 1 segundo'
  if (seconds < 60n) return `${seconds} s`
  if (seconds < 3_600n) return `${seconds / 60n} min`
  if (seconds < 86_400n) return `${seconds / 3_600n} h`
  const days = seconds / 86_400n
  if (days < 365n) return `${days} dias`
  const years = days / 365n
  return years > 999_999n ? `${years.toString().length} dígitos em anos` : `${formatCount(years)} anos`
}
