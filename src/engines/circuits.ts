export type CircuitSignal = 0 | 1 | 'X'

export type GateKind = 'NOT' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'

export type CircuitElementKind = 'input' | 'constant' | 'gate' | 'output'

export interface CircuitElement {
  id: string
  kind: CircuitElementKind
  label: string
  gate?: GateKind
  inputValue?: 0 | 1
}

export interface CircuitConnection {
  id: string
  source: string
  target: string
  targetPort: string
}

export interface CircuitDiagnostic {
  id: string
  severity: 'warning' | 'error'
  title: string
  explanation: string
  refs: string[]
}

export interface CircuitTraceStep {
  nodeId: string
  label: string
  signal: CircuitSignal
  explanation: string
}

export interface CircuitEvaluation {
  nodeValues: Record<string, CircuitSignal>
  wireValues: Record<string, CircuitSignal>
  diagnostics: CircuitDiagnostic[]
  trace: CircuitTraceStep[]
}

export const gateInputCount = (gate: GateKind) => gate === 'NOT' ? 1 : 2

function invert(signal: CircuitSignal): CircuitSignal {
  return signal === 'X' ? 'X' : signal === 1 ? 0 : 1
}

export function evaluateGate(gate: GateKind, inputs: CircuitSignal[]): CircuitSignal {
  if (gate === 'NOT') return invert(inputs[0] ?? 'X')

  if (gate === 'AND' || gate === 'NAND') {
    const value: CircuitSignal = inputs.includes(0) ? 0 : inputs.every((input) => input === 1) ? 1 : 'X'
    return gate === 'NAND' ? invert(value) : value
  }

  if (gate === 'OR' || gate === 'NOR') {
    const value: CircuitSignal = inputs.includes(1) ? 1 : inputs.every((input) => input === 0) ? 0 : 'X'
    return gate === 'NOR' ? invert(value) : value
  }

  const value: CircuitSignal = inputs.some((input) => input === 'X')
    ? 'X'
    : inputs.filter((input) => input === 1).length % 2 === 1 ? 1 : 0
  return gate === 'XNOR' ? invert(value) : value
}

function gateExplanation(gate: GateKind, inputs: CircuitSignal[], result: CircuitSignal) {
  const values = inputs.join(', ')
  if (result === 'X') return `${gate} ainda não pode ser calculada porque falta definir uma entrada.`
  const descriptions: Record<GateKind, string> = {
    NOT: 'NOT inverte o sinal de entrada.',
    AND: 'AND produz 1 somente quando todas as entradas são 1.',
    OR: 'OR produz 1 quando ao menos uma entrada é 1.',
    XOR: 'XOR produz 1 quando as entradas são diferentes.',
    NAND: 'NAND inverte o resultado da porta AND.',
    NOR: 'NOR inverte o resultado da porta OR.',
    XNOR: 'XNOR produz 1 quando as entradas são iguais.',
  }
  return `Entradas ${values}: ${descriptions[gate]}`
}

function uniqueDiagnostics(items: CircuitDiagnostic[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export function evaluateCircuit(
  elements: CircuitElement[],
  connections: CircuitConnection[],
  overrides: Record<string, 0 | 1> = {},
): CircuitEvaluation {
  const byId = new Map(elements.map((element) => [element.id, element]))
  const incoming = new Map<string, CircuitConnection[]>()
  const diagnostics: CircuitDiagnostic[] = []
  const trace: CircuitTraceStep[] = []

  for (const connection of connections) {
    const list = incoming.get(connection.target) ?? []
    list.push(connection)
    incoming.set(connection.target, list)
    if (!byId.has(connection.source) || !byId.has(connection.target)) {
      diagnostics.push({
        id: `missing-node-${connection.id}`,
        severity: 'error',
        title: 'Conexão incompleta',
        explanation: 'Um fio aponta para um componente que não existe mais.',
        refs: [connection.id],
      })
    }
  }

  for (const [target, wires] of incoming) {
    const byPort = new Map<string, CircuitConnection[]>()
    for (const wire of wires) byPort.set(wire.targetPort, [...(byPort.get(wire.targetPort) ?? []), wire])
    for (const [port, drivers] of byPort) {
      if (drivers.length > 1) {
        diagnostics.push({
          id: `multiple-drivers-${target}-${port}`,
          severity: 'error',
          title: 'Dois sinais na mesma entrada',
          explanation: 'Cada entrada deve receber apenas um fio. Remova uma das conexões concorrentes.',
          refs: drivers.map((wire) => wire.id),
        })
      }
    }
  }

  const memo = new Map<string, CircuitSignal>()
  const visiting = new Set<string>()

  const readInput = (targetId: string, port: string): CircuitSignal => {
    const drivers = (incoming.get(targetId) ?? []).filter((wire) => wire.targetPort === port)
    if (drivers.length !== 1) return 'X'
    return evaluateNode(drivers[0].source)
  }

  const evaluateNode = (nodeId: string): CircuitSignal => {
    if (memo.has(nodeId)) return memo.get(nodeId)!
    if (visiting.has(nodeId)) {
      diagnostics.push({
        id: `cycle-${nodeId}`,
        severity: 'error',
        title: 'Ciclo combinacional detectado',
        explanation: 'O sinal volta para uma porta anterior. Neste laboratório, circuitos combinacionais precisam seguir em uma única direção.',
        refs: [...visiting, nodeId],
      })
      return 'X'
    }

    const element = byId.get(nodeId)
    if (!element) return 'X'
    visiting.add(nodeId)
    let signal: CircuitSignal = 'X'

    if (overrides[nodeId] !== undefined) {
      signal = overrides[nodeId]
    } else if (element.kind === 'input' || element.kind === 'constant') {
      signal = element.inputValue ?? 'X'
    } else if (element.kind === 'gate' && element.gate) {
      const inputs = Array.from({ length: gateInputCount(element.gate) }, (_, index) => readInput(nodeId, `in-${index}`))
      signal = evaluateGate(element.gate, inputs)
      trace.push({ nodeId, label: element.label, signal, explanation: gateExplanation(element.gate, inputs, signal) })
      inputs.forEach((input, index) => {
        if (input === 'X') {
          diagnostics.push({
            id: `floating-${nodeId}-${index}`,
            severity: 'warning',
            title: `Entrada ${index + 1} de ${element.label} está livre`,
            explanation: 'Conecte um switch, uma constante ou a saída de outra porta para definir este sinal.',
            refs: [nodeId],
          })
        }
      })
    } else if (element.kind === 'output') {
      signal = readInput(nodeId, 'in-0')
      trace.push({
        nodeId,
        label: element.label,
        signal,
        explanation: signal === 'X' ? 'A saída ainda não recebeu um sinal definido.' : `A saída recebeu o sinal ${signal}.`,
      })
      if (signal === 'X') {
        diagnostics.push({
          id: `floating-output-${nodeId}`,
          severity: 'warning',
          title: `${element.label} está sem sinal`,
          explanation: 'Conecte a saída de uma porta ou de uma entrada à lâmpada.',
          refs: [nodeId],
        })
      }
    }

    visiting.delete(nodeId)
    memo.set(nodeId, signal)
    return signal
  }

  for (const element of elements) evaluateNode(element.id)

  return {
    nodeValues: Object.fromEntries(elements.map((element) => [element.id, memo.get(element.id) ?? 'X'])),
    wireValues: Object.fromEntries(connections.map((wire) => [wire.id, memo.get(wire.source) ?? 'X'])),
    diagnostics: uniqueDiagnostics(diagnostics),
    trace,
  }
}

function gateExpression(gate: GateKind, inputs: string[]) {
  const [left = '?', right = '?'] = inputs
  if (gate === 'NOT') return `¬${left.startsWith('(') ? left : `(${left})`}`
  if (gate === 'AND') return `(${left} ∧ ${right})`
  if (gate === 'OR') return `(${left} ∨ ${right})`
  if (gate === 'XOR') return `(${left} ⊕ ${right})`
  if (gate === 'NAND') return `¬(${left} ∧ ${right})`
  if (gate === 'NOR') return `¬(${left} ∨ ${right})`
  return `¬(${left} ⊕ ${right})`
}

export function circuitExpression(elements: CircuitElement[], connections: CircuitConnection[], nodeId: string): string {
  const byId = new Map(elements.map((element) => [element.id, element]))
  const visiting = new Set<string>()
  const build = (id: string): string => {
    const element = byId.get(id)
    if (!element) return '?'
    if (visiting.has(id)) return 'ciclo'
    if (element.kind === 'input') return element.label
    if (element.kind === 'constant') return String(element.inputValue ?? '?')
    visiting.add(id)
    const sourceAt = (port: string) => connections.find((wire) => wire.target === id && wire.targetPort === port)?.source
    let result = '?'
    if (element.kind === 'output') {
      const source = sourceAt('in-0')
      result = source ? build(source) : '?'
    } else if (element.kind === 'gate' && element.gate) {
      const inputs = Array.from({ length: gateInputCount(element.gate) }, (_, index) => {
        const source = sourceAt(`in-${index}`)
        return source ? build(source) : '?'
      })
      result = gateExpression(element.gate, inputs)
    }
    visiting.delete(id)
    return result
  }
  return build(nodeId)
}

interface SelectionInput {
  id: string
  label: string
  sourceId?: string
}

export interface SelectionTruthRow {
  values: Record<string, CircuitSignal>
}

export interface SelectionAnalysis {
  valid: boolean
  error?: string
  inputs: SelectionInput[]
  columns: Array<{ id: string; label: string }>
  outputIds: string[]
  expressions: Record<string, string>
  rows: SelectionTruthRow[]
}

export function analyzeCircuitSelection(
  elements: CircuitElement[],
  connections: CircuitConnection[],
  selectedIds: string[],
): SelectionAnalysis {
  const byId = new Map(elements.map((element) => [element.id, element]))
  const selected = new Set(selectedIds.filter((id) => {
    const kind = byId.get(id)?.kind
    return kind === 'gate' || kind === 'output'
  }))
  const empty = { valid: false, inputs: [], columns: [], outputIds: [], expressions: {}, rows: [] }
  if (!selected.size) return { ...empty, error: 'Selecione ao menos uma porta lógica no canvas.' }

  if (selected.size > 1) {
    const adjacency = new Map([...selected].map((id) => [id, new Set<string>()]))
    for (const wire of connections) {
      if (selected.has(wire.source) && selected.has(wire.target)) {
        adjacency.get(wire.source)?.add(wire.target)
        adjacency.get(wire.target)?.add(wire.source)
      }
    }
    const first = [...selected][0]
    const seen = new Set<string>([first])
    const queue = [first]
    while (queue.length) {
      for (const neighbor of adjacency.get(queue.shift()!) ?? []) {
        if (!seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor) }
      }
    }
    if (seen.size !== selected.size) return { ...empty, error: 'A seleção possui trechos desconectados. Selecione um único caminho lógico.' }
  }

  const outgoingInside = new Set(connections.filter((wire) => selected.has(wire.source) && selected.has(wire.target)).map((wire) => wire.source))
  const outputIds = [...selected].filter((id) => byId.get(id)?.kind === 'output' || !outgoingInside.has(id))
  const inputs = new Map<string, SelectionInput>()
  const valueMemo = new Map<string, CircuitSignal>()
  const order: string[] = []
  const visiting = new Set<string>()

  const incomingAt = (target: string, port: string) => connections.find((wire) => wire.target === target && wire.targetPort === port)
  const boundaryFor = (target: CircuitElement, port: string, sourceId?: string) => {
    if (sourceId) {
      const source = byId.get(sourceId)
      if (source?.kind === 'constant') return { fixed: (source.inputValue ?? 0) as 0 | 1 } as const
      const id = `boundary:${sourceId}`
      inputs.set(id, { id, label: source?.label ?? 'Entrada', sourceId })
      return { inputId: id } as const
    }
    const index = Number(port.replace('in-', '')) + 1
    const id = `virtual:${target.id}:${port}`
    inputs.set(id, { id, label: `${target.label}·E${index}` })
    return { inputId: id } as const
  }

  const evaluateSelected = (id: string, assignment: Record<string, 0 | 1>): CircuitSignal => {
    if (valueMemo.has(id)) return valueMemo.get(id)!
    if (visiting.has(id)) return 'X'
    const element = byId.get(id)
    if (!element) return 'X'
    visiting.add(id)

    const read = (port: string): CircuitSignal => {
      const wire = incomingAt(id, port)
      if (wire && selected.has(wire.source)) return evaluateSelected(wire.source, assignment)
      const boundary = boundaryFor(element, port, wire?.source)
      if ('fixed' in boundary) return boundary.fixed ?? 0
      return assignment[boundary.inputId] ?? 0
    }

    let value: CircuitSignal = 'X'
    if (element.kind === 'output') value = read('in-0')
    else if (element.kind === 'gate' && element.gate) {
      value = evaluateGate(element.gate, Array.from({ length: gateInputCount(element.gate) }, (_, index) => read(`in-${index}`)))
    }
    visiting.delete(id)
    valueMemo.set(id, value)
    if (!order.includes(id)) order.push(id)
    return value
  }

  // First pass discovers all boundary inputs without depending on a particular valuation.
  for (const outputId of outputIds) evaluateSelected(outputId, {})
  if (inputs.size > 4) return { ...empty, error: `Este trecho possui ${inputs.size} entradas independentes. Selecione no máximo quatro para manter a tabela legível.` }

  const inputList = [...inputs.values()]
  const columns = order.map((id) => ({ id, label: byId.get(id)?.label ?? id }))
  const rows: SelectionTruthRow[] = []
  for (let row = 0; row < 2 ** inputList.length; row += 1) {
    const assignment = Object.fromEntries(inputList.map((input, index) => [input.id, ((row >> (inputList.length - index - 1)) & 1) as 0 | 1]))
    valueMemo.clear()
    visiting.clear()
    const values: Record<string, CircuitSignal> = { ...assignment }
    for (const outputId of outputIds) evaluateSelected(outputId, assignment)
    for (const column of columns) values[column.id] = valueMemo.get(column.id) ?? 'X'
    rows.push({ values })
  }

  const expressionMemo = new Map<string, string>()
  const expressionFor = (id: string): string => {
    if (expressionMemo.has(id)) return expressionMemo.get(id)!
    const element = byId.get(id)
    if (!element) return '?'
    const expressionAt = (port: string) => {
      const wire = incomingAt(id, port)
      if (wire && selected.has(wire.source)) return expressionFor(wire.source)
      const boundary = boundaryFor(element, port, wire?.source)
      if ('fixed' in boundary) return String(boundary.fixed)
      return inputs.get(boundary.inputId)?.label ?? '?'
    }
    const expression = element.kind === 'output'
      ? expressionAt('in-0')
      : element.kind === 'gate' && element.gate
        ? gateExpression(element.gate, Array.from({ length: gateInputCount(element.gate) }, (_, index) => expressionAt(`in-${index}`)))
        : element.label
    expressionMemo.set(id, expression)
    return expression
  }

  return {
    valid: true,
    inputs: inputList,
    columns,
    outputIds,
    expressions: Object.fromEntries(outputIds.map((id) => [id, expressionFor(id)])),
    rows,
  }
}

export function wouldCreateCycle(connections: CircuitConnection[], source: string, target: string) {
  const adjacency = new Map<string, string[]>()
  for (const wire of connections) adjacency.set(wire.source, [...(adjacency.get(wire.source) ?? []), wire.target])
  adjacency.set(source, [...(adjacency.get(source) ?? []), target])
  const stack = [target]
  const visited = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current)
    stack.push(...(adjacency.get(current) ?? []))
  }
  return false
}
