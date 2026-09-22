import {
  expressionEquals,
  expressionToString,
  type Expr,
} from './logic'

export interface Transformation {
  id: string
  law: string
  path: string
  before: string
  after: string
  explanation: string
  expression: Expr
}

interface RuleResult {
  law: string
  expression: Expr
  explanation: string
}

const constant = (value: boolean): Expr => ({ type: 'const', value })
const not = (arg: Expr): Expr => ({ type: 'not', arg })
const binary = (type: 'and' | 'or' | 'implies' | 'iff', left: Expr, right: Expr): Expr => ({ type, left, right })
const isTrue = (expr: Expr) => expr.type === 'const' && expr.value
const isFalse = (expr: Expr) => expr.type === 'const' && !expr.value
const isNegationOf = (left: Expr, right: Expr) =>
  (left.type === 'not' && expressionEquals(left.arg, right)) ||
  (right.type === 'not' && expressionEquals(right.arg, left))

function rules(node: Expr): RuleResult[] {
  const results: RuleResult[] = []
  if (node.type === 'not' && node.arg.type === 'not') {
    results.push({ law: 'Dupla negação', expression: node.arg.arg, explanation: 'Duas negações consecutivas restauram a proposição.' })
  }
  if (node.type === 'not' && node.arg.type === 'and') {
    results.push({ law: 'De Morgan', expression: binary('or', not(node.arg.left), not(node.arg.right)), explanation: 'A negação entra nos termos e troca ∧ por ∨.' })
  }
  if (node.type === 'not' && node.arg.type === 'or') {
    results.push({ law: 'De Morgan', expression: binary('and', not(node.arg.left), not(node.arg.right)), explanation: 'A negação entra nos termos e troca ∨ por ∧.' })
  }
  if (node.type === 'implies') {
    results.push({ law: 'Implicação', expression: binary('or', not(node.left), node.right), explanation: 'p → q equivale a ¬p ∨ q.' })
  }
  if (node.type === 'iff') {
    results.push({ law: 'Bicondicional', expression: binary('and', binary('implies', node.left, node.right), binary('implies', node.right, node.left)), explanation: 'O bicondicional exige as duas implicações.' })
  }
  if (node.type === 'and' || node.type === 'or') {
    const other = node.type === 'and' ? 'or' : 'and'
    const identity = node.type === 'and' ? isTrue : isFalse
    const domination = node.type === 'and' ? isFalse : isTrue
    if (identity(node.left)) results.push({ law: 'Identidade', expression: node.right, explanation: 'O elemento neutro pode ser removido.' })
    if (identity(node.right)) results.push({ law: 'Identidade', expression: node.left, explanation: 'O elemento neutro pode ser removido.' })
    if (domination(node.left) || domination(node.right)) results.push({ law: 'Dominação', expression: constant(node.type === 'or'), explanation: 'O valor dominante determina toda a expressão.' })
    if (expressionEquals(node.left, node.right)) results.push({ law: 'Idempotência', expression: node.left, explanation: 'Repetir a mesma proposição não altera o resultado.' })
    results.push({ law: 'Comutativa', expression: binary(node.type, node.right, node.left), explanation: 'A ordem dos operandos pode ser trocada.' })
    if (isNegationOf(node.left, node.right)) {
      results.push({
        law: node.type === 'or' ? 'Terceiro excluído' : 'Não contradição',
        expression: constant(node.type === 'or'),
        explanation: node.type === 'or' ? 'p ∨ ¬p é sempre verdadeiro.' : 'p ∧ ¬p é sempre falso.',
      })
    }
    if (node.left.type === node.type) {
      results.push({ law: 'Associativa', expression: binary(node.type, node.left.left, binary(node.type, node.left.right, node.right)), explanation: 'O agrupamento muda sem alterar a ordem dos termos.' })
    }
    if (node.right.type === node.type) {
      results.push({ law: 'Associativa', expression: binary(node.type, binary(node.type, node.left, node.right.left), node.right.right), explanation: 'O agrupamento muda sem alterar a ordem dos termos.' })
    }
    if (node.right.type === other) {
      results.push({
        law: 'Distributiva',
        expression: binary(other, binary(node.type, node.left, node.right.left), binary(node.type, node.left, node.right.right)),
        explanation: 'O termo externo é distribuído pelos dois termos internos.',
      })
    }
    if (node.left.type === other) {
      results.push({
        law: 'Distributiva',
        expression: binary(other, binary(node.type, node.left.left, node.right), binary(node.type, node.left.right, node.right)),
        explanation: 'O termo externo é distribuído pelos dois termos internos.',
      })
    }
    const absorbs = (outer: Expr, inner: Expr) =>
      inner.type === other && (expressionEquals(outer, inner.left) || expressionEquals(outer, inner.right))
    if (absorbs(node.left, node.right)) results.push({ law: 'Absorção', expression: node.left, explanation: 'O termo externo absorve o grupo que já o contém.' })
    if (absorbs(node.right, node.left)) results.push({ law: 'Absorção', expression: node.right, explanation: 'O termo externo absorve o grupo que já o contém.' })
  }
  return results
}

function replaceAt(root: Expr, path: number[], replacement: Expr): Expr {
  if (path.length === 0) return replacement
  const [head, ...tail] = path
  if (root.type === 'not') return { ...root, arg: replaceAt(root.arg, tail, replacement) }
  if (root.type === 'var' || root.type === 'const') return root
  return head === 0
    ? { ...root, left: replaceAt(root.left, tail, replacement) }
    : { ...root, right: replaceAt(root.right, tail, replacement) }
}

function visit(root: Expr, node: Expr, path: number[], output: Transformation[]) {
  for (const [index, result] of rules(node).entries()) {
    const expression = replaceAt(root, path, result.expression)
    if (!expressionEquals(root, expression)) {
      output.push({
        id: `${result.law}-${path.join('.') || 'root'}-${index}-${expressionToString(expression)}`,
        law: result.law,
        path: path.length ? path.join('.') : 'expressão completa',
        before: expressionToString(node),
        after: expressionToString(result.expression),
        explanation: result.explanation,
        expression,
      })
    }
  }
  if (node.type === 'not') visit(root, node.arg, [...path, 0], output)
  else if (node.type !== 'var' && node.type !== 'const') {
    visit(root, node.left, [...path, 0], output)
    visit(root, node.right, [...path, 1], output)
  }
}

export function findTransformations(expression: Expr): Transformation[] {
  const output: Transformation[] = []
  visit(expression, expression, [], output)
  return output.filter(
    (candidate, index) =>
      output.findIndex(
        (other) => other.law === candidate.law && expressionEquals(other.expression, candidate.expression),
      ) === index,
  )
}
