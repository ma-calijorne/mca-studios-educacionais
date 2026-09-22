export type Expr =
  | { type: 'var'; name: string }
  | { type: 'const'; value: boolean }
  | { type: 'not'; arg: Expr }
  | { type: 'and' | 'or' | 'implies' | 'iff'; left: Expr; right: Expr }

type TokenType =
  | 'identifier'
  | 'true'
  | 'false'
  | 'not'
  | 'and'
  | 'or'
  | 'implies'
  | 'iff'
  | 'left'
  | 'right'
  | 'end'

interface Token {
  type: TokenType
  value: string
  position: number
}

const wordTokens: Record<string, TokenType> = {
  v: 'true',
  verdadeiro: 'true',
  true: 'true',
  f: 'false',
  falso: 'false',
  false: 'false',
  nao: 'not',
  não: 'not',
  not: 'not',
  e: 'and',
  and: 'and',
  ou: 'or',
  or: 'or',
  implica: 'implies',
  sse: 'iff',
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const chunk = source.slice(index)
    const whitespace = chunk.match(/^\s+/)
    if (whitespace) {
      index += whitespace[0].length
      continue
    }
    const operators: Array<[RegExp, TokenType]> = [
      [/^(<->|<=>|↔)/, 'iff'],
      [/^(->|=>|→)/, 'implies'],
      [/^(&&|∧|&)/, 'and'],
      [/^(\|\||∨|\|)/, 'or'],
      [/^(!|¬|~)/, 'not'],
      [/^\(/, 'left'],
      [/^\)/, 'right'],
    ]
    let matched = false
    for (const [pattern, type] of operators) {
      const match = chunk.match(pattern)
      if (match) {
        tokens.push({ type, value: match[0], position: index })
        index += match[0].length
        matched = true
        break
      }
    }
    if (matched) continue
    const identifier = chunk.match(/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/)
    if (identifier) {
      const normalized = identifier[0].toLocaleLowerCase('pt-BR')
      tokens.push({
        type: wordTokens[normalized] ?? 'identifier',
        value: identifier[0],
        position: index,
      })
      index += identifier[0].length
      continue
    }
    throw new Error(`Símbolo não reconhecido na posição ${index + 1}: “${source[index]}”.`)
  }
  tokens.push({ type: 'end', value: '', position: source.length })
  return tokens
}

class Parser {
  private index = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): Expr {
    const expression = this.parseIff()
    if (this.peek().type !== 'end') {
      throw new Error(`Expressão inesperada perto de “${this.peek().value}”.`)
    }
    return expression
  }

  private peek() {
    return this.tokens[this.index]
  }

  private take(type?: TokenType) {
    const token = this.peek()
    if (type && token.type !== type) {
      throw new Error(`Esperado ${type} na posição ${token.position + 1}.`)
    }
    this.index += 1
    return token
  }

  private parseIff(): Expr {
    let left = this.parseImplies()
    while (this.peek().type === 'iff') {
      this.take()
      left = { type: 'iff', left, right: this.parseImplies() }
    }
    return left
  }

  private parseImplies(): Expr {
    const left = this.parseOr()
    if (this.peek().type === 'implies') {
      this.take()
      return { type: 'implies', left, right: this.parseImplies() }
    }
    return left
  }

  private parseOr(): Expr {
    let left = this.parseAnd()
    while (this.peek().type === 'or') {
      this.take()
      left = { type: 'or', left, right: this.parseAnd() }
    }
    return left
  }

  private parseAnd(): Expr {
    let left = this.parseNot()
    while (this.peek().type === 'and') {
      this.take()
      left = { type: 'and', left, right: this.parseNot() }
    }
    return left
  }

  private parseNot(): Expr {
    if (this.peek().type === 'not') {
      this.take()
      return { type: 'not', arg: this.parseNot() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): Expr {
    const token = this.peek()
    if (token.type === 'identifier') {
      this.take()
      return { type: 'var', name: token.value }
    }
    if (token.type === 'true' || token.type === 'false') {
      this.take()
      return { type: 'const', value: token.type === 'true' }
    }
    if (token.type === 'left') {
      this.take()
      const expression = this.parseIff()
      this.take('right')
      return expression
    }
    throw new Error(`Esperada uma proposição na posição ${token.position + 1}.`)
  }
}

export function parseExpression(source: string): Expr {
  if (!source.trim()) throw new Error('Digite ou monte uma expressão.')
  return new Parser(tokenize(source)).parse()
}

export interface EvaluationStep {
  expression: string
  result: boolean
  explanation: string
}

export function evaluateExpression(
  expression: Expr,
  values: Record<string, boolean>,
  steps: EvaluationStep[] = [],
): boolean {
  let result: boolean
  let explanation: string
  switch (expression.type) {
    case 'var':
      result = Boolean(values[expression.name])
      explanation = `${expression.name} vale ${result ? 'V' : 'F'}.`
      break
    case 'const':
      result = expression.value
      explanation = `A constante vale ${result ? 'V' : 'F'}.`
      break
    case 'not': {
      const value = evaluateExpression(expression.arg, values, steps)
      result = !value
      explanation = `A negação de ${value ? 'V' : 'F'} é ${result ? 'V' : 'F'}.`
      break
    }
    case 'and': {
      const left = evaluateExpression(expression.left, values, steps)
      const right = evaluateExpression(expression.right, values, steps)
      result = left && right
      explanation = `A conjunção exige os dois valores verdadeiros.`
      break
    }
    case 'or': {
      const left = evaluateExpression(expression.left, values, steps)
      const right = evaluateExpression(expression.right, values, steps)
      result = left || right
      explanation = `A disjunção é verdadeira quando ao menos um valor é verdadeiro.`
      break
    }
    case 'implies': {
      const left = evaluateExpression(expression.left, values, steps)
      const right = evaluateExpression(expression.right, values, steps)
      result = !left || right
      explanation = left && !right
        ? 'A condição foi ativada, mas a consequência não ocorreu: a promessa foi quebrada.'
        : 'Não ocorreu o único caso que torna a implicação falsa.'
      break
    }
    case 'iff': {
      const left = evaluateExpression(expression.left, values, steps)
      const right = evaluateExpression(expression.right, values, steps)
      result = left === right
      explanation = `O bicondicional é verdadeiro quando os dois lados possuem o mesmo valor.`
      break
    }
  }
  if (expression.type !== 'var') {
    steps.push({ expression: expressionToString(expression), result, explanation })
  }
  return result
}

const precedence: Record<Expr['type'], number> = {
  var: 6,
  const: 6,
  not: 5,
  and: 4,
  or: 3,
  implies: 2,
  iff: 1,
}

export function expressionToString(expression: Expr, parent = 0): string {
  if (expression.type === 'var') return expression.name
  if (expression.type === 'const') return expression.value ? 'V' : 'F'
  if (expression.type === 'not') {
    const value = `¬${expressionToString(expression.arg, precedence.not)}`
    return precedence.not < parent ? `(${value})` : value
  }
  const symbols = { and: '∧', or: '∨', implies: '→', iff: '↔' } as const
  const current = precedence[expression.type]
  const value = `${expressionToString(expression.left, current)} ${symbols[expression.type]} ${expressionToString(expression.right, current + (expression.type === 'implies' ? -1 : 0))}`
  return current < parent ? `(${value})` : value
}

export function expressionToLatex(expression: Expr): string {
  return expressionToString(expression)
    .replaceAll('¬', '\\neg ')
    .replaceAll('∧', '\\land')
    .replaceAll('∨', '\\lor')
    .replaceAll('→', '\\to')
    .replaceAll('↔', '\\leftrightarrow')
}

export function expressionVariables(expression: Expr): string[] {
  const values = new Set<string>()
  const visit = (node: Expr) => {
    if (node.type === 'var') values.add(node.name)
    else if (node.type === 'not') visit(node.arg)
    else if (node.type !== 'const') {
      visit(node.left)
      visit(node.right)
    }
  }
  visit(expression)
  return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export interface TruthRow {
  values: Record<string, boolean>
  result: boolean
}

export function buildTruthTable(expression: Expr): TruthRow[] {
  const variables = expressionVariables(expression)
  return Array.from({ length: 2 ** variables.length }, (_, row) => {
    const values = Object.fromEntries(
      variables.map((variable, index) => [variable, ((row >> (variables.length - index - 1)) & 1) === 0]),
    )
    return { values, result: evaluateExpression(expression, values) }
  })
}

export function classifyTruthTable(rows: TruthRow[]): 'tautologia' | 'contradição' | 'contingência' {
  if (rows.every((row) => row.result)) return 'tautologia'
  if (rows.every((row) => !row.result)) return 'contradição'
  return 'contingência'
}

export function expressionsEquivalent(left: Expr, right: Expr): boolean {
  const variables = [...new Set([...expressionVariables(left), ...expressionVariables(right)])].sort()
  for (let row = 0; row < 2 ** variables.length; row += 1) {
    const values = Object.fromEntries(
      variables.map((variable, index) => [variable, ((row >> (variables.length - index - 1)) & 1) === 0]),
    )
    if (evaluateExpression(left, values) !== evaluateExpression(right, values)) return false
  }
  return true
}

export function expressionEquals(left: Expr, right: Expr): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
