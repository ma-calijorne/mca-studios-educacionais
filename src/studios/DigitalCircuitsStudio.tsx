import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  AlertTriangle,
  Binary,
  Cable,
  CheckCircle2,
  GripVertical,
  Lightbulb,
  MousePointer2,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import type { Mode } from '../core/types'
import { journalAction, useLearningStore } from '../core/store'
import {
  analyzeCircuitSelection,
  circuitExpression,
  evaluateCircuit,
  wouldCreateCycle,
  type CircuitConnection,
  type CircuitElement,
  type CircuitSignal,
  type GateKind,
  type SelectionAnalysis,
} from '../engines/circuits'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'
import {
  CircuitNodeActionsContext,
  LogicGateSymbol,
  circuitNodeTypes,
  type CircuitFlowNode,
  type CircuitNodeData,
} from '../components/circuits/CircuitNodes'

type CircuitFlowEdge = Edge

interface CircuitPreset {
  title: string
  description: string
  nodes: CircuitFlowNode[]
  edges: CircuitFlowEdge[]
}

interface CircuitSnapshot {
  nodes: CircuitFlowNode[]
  edges: CircuitFlowEdge[]
}

interface PaletteItem {
  key: string
  label: string
  kind: CircuitNodeData['kind']
  gate?: GateKind
  inputValue?: 0 | 1
}

interface CircuitDocument {
  schemaVersion: 1
  nodes: CircuitFlowNode[]
  edges: CircuitFlowEdge[]
}

const sandboxStorageKey = 'mci-circuit-sandbox-v1'

const gates: GateKind[] = ['NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR']

const paletteGroups: Array<{ title: string; items: PaletteItem[] }> = [
  {
    title: 'Entradas',
    items: [
      { key: 'switch', label: 'Switch', kind: 'input', inputValue: 0 },
      { key: 'constant-0', label: 'Constante 0', kind: 'constant', inputValue: 0 },
      { key: 'constant-1', label: 'Constante 1', kind: 'constant', inputValue: 1 },
    ],
  },
  { title: 'Portas', items: gates.map((gate) => ({ key: gate.toLowerCase(), label: gate, kind: 'gate' as const, gate })) },
  { title: 'Saídas', items: [{ key: 'lamp', label: 'Lâmpada', kind: 'output' }] },
]

function circuitNode(
  id: string,
  kind: CircuitNodeData['kind'],
  label: string,
  x: number,
  y: number,
  data: Partial<CircuitNodeData> = {},
): CircuitFlowNode {
  return { id, type: kind, position: { x, y }, data: { kind, label, ...data } }
}

function wire(id: string, source: string, target: string, targetPort: string): CircuitFlowEdge {
  return { id, source, target, sourceHandle: 'out', targetHandle: targetPort, type: 'smoothstep' }
}

const presets: Record<Mode, CircuitPreset> = {
  learn: {
    title: 'O que precisa ser verdadeiro para a lâmpada acender?',
    description: 'Duas condições de segurança controlam uma máquina. Faça sua previsão e acompanhe cada sinal.',
    nodes: [
      circuitNode('A', 'input', 'Porta fechada', 45, 80, { inputValue: 1 }),
      circuitNode('B', 'input', 'Botão pressionado', 45, 245, { inputValue: 0 }),
      circuitNode('G1', 'gate', 'Condições', 305, 155, { gate: 'AND' }),
      circuitNode('Y', 'output', 'Máquina', 560, 160),
    ],
    edges: [wire('A-G1-0', 'A', 'G1', 'in-0'), wire('B-G1-1', 'B', 'G1', 'in-1'), wire('G1-Y', 'G1', 'Y', 'in-0')],
  },
  explore: {
    title: 'Como um alarme combina seus sensores?',
    description: 'O alarme dispara quando uma abertura é detectada e o sistema está habilitado. Troque estados e portas.',
    nodes: [
      circuitNode('A', 'input', 'Porta', 30, 45, { inputValue: 0 }),
      circuitNode('B', 'input', 'Janela', 30, 190, { inputValue: 1 }),
      circuitNode('C', 'input', 'Habilitado', 290, 310, { inputValue: 1 }),
      circuitNode('G1', 'gate', 'Abertura', 275, 110, { gate: 'OR' }),
      circuitNode('G2', 'gate', 'Proteção', 505, 175, { gate: 'AND' }),
      circuitNode('Y', 'output', 'Alarme', 730, 180),
    ],
    edges: [
      wire('A-G1-0', 'A', 'G1', 'in-0'), wire('B-G1-1', 'B', 'G1', 'in-1'),
      wire('G1-G2-0', 'G1', 'G2', 'in-0'), wire('C-G2-1', 'C', 'G2', 'in-1'), wire('G2-Y', 'G2', 'Y', 'in-0'),
    ],
  },
  sandbox: {
    title: 'Construa, conecte e investigue',
    description: 'Crie um circuito livre. Arraste componentes, ligue portas e analise qualquer trecho que despertar sua curiosidade.',
    nodes: [],
    edges: [],
  },
  challenges: {
    title: 'Faça a lâmpada reconhecer exatamente um sinal',
    description: 'O circuito inicial usa OR, mas a regra exige saída 1 somente quando exatamente um switch estiver ligado.',
    nodes: [
      circuitNode('A', 'input', 'A', 55, 85, { inputValue: 0 }),
      circuitNode('B', 'input', 'B', 55, 250, { inputValue: 1 }),
      circuitNode('G1', 'gate', 'Porta atual', 320, 160, { gate: 'OR' }),
      circuitNode('Y', 'output', 'Y', 575, 165),
    ],
    edges: [wire('A-G1-0', 'A', 'G1', 'in-0'), wire('B-G1-1', 'B', 'G1', 'in-1'), wire('G1-Y', 'G1', 'Y', 'in-0')],
  },
}

function clonePreset(mode: Mode): CircuitPreset {
  return structuredClone(presets[mode])
}

function loadSandbox(): CircuitDocument | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(sandboxStorageKey) ?? 'null') as CircuitDocument | null
    if (parsed?.schemaVersion === 1 && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed
  } catch {
    // A malformed local draft must never prevent opening the studio.
  }
  return null
}

function initialCircuit(mode: Mode) {
  if (mode === 'sandbox') {
    const saved = loadSandbox()
    if (saved) return { nodes: structuredClone(saved.nodes), edges: structuredClone(saved.edges) }
  }
  return clonePreset(mode)
}

function toElements(nodes: CircuitFlowNode[]): CircuitElement[] {
  return nodes.map((node) => ({
    id: node.id,
    kind: node.data.kind,
    label: node.data.label,
    gate: node.data.gate,
    inputValue: node.data.inputValue,
  }))
}

function toConnections(edges: CircuitFlowEdge[]): CircuitConnection[] {
  return edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, targetPort: edge.targetHandle ?? 'in-0' }))
}

function signalLabel(signal: CircuitSignal) {
  return signal === 1 ? '1 · ligado' : signal === 0 ? '0 · desligado' : 'X · indefinido'
}

function signalCell(signal: CircuitSignal) {
  return <span className={`circuit-bit is-${signal === 'X' ? 'unknown' : signal === 1 ? 'on' : 'off'}`}>{signal}</span>
}

function SelectionInspector({
  analysis,
  evaluation,
  onClose,
  onClear,
}: {
  analysis: SelectionAnalysis
  evaluation: ReturnType<typeof evaluateCircuit>
  onClose: () => void
  onClear: () => void
}) {
  const currentRow = analysis.valid && analysis.inputs.every((input) => input.sourceId && evaluation.nodeValues[input.sourceId] !== 'X')
    ? analysis.rows.findIndex((row) => analysis.inputs.every((input) => row.values[input.id] === evaluation.nodeValues[input.sourceId!]))
    : -1

  return (
    <div className="investigation circuit-analysis">
      <div className="circuit-analysis__heading">
        <div><div className="eyebrow"><Binary size={13} /> Tabela da seleção</div><h3>Comportamento do trecho</h3></div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar análise"><X size={16} /></button>
      </div>
      {!analysis.valid ? (
        <div className="circuit-empty-analysis"><MousePointer2 size={26} /><strong>Selecione uma ou mais portas</strong><p>{analysis.error}</p></div>
      ) : (
        <>
          <div className="circuit-expressions">
            {analysis.outputIds.map((id) => {
              const column = analysis.columns.find((item) => item.id === id)
              return <div key={id}><span>{column?.label ?? 'Saída'}</span><strong>{analysis.expressions[id]}</strong></div>
            })}
          </div>
          <p className="circuit-analysis__hint">A linha destacada representa o estado atual dos switches.</p>
          <div className="circuit-truth-table-wrap">
            <table className="circuit-truth-table">
              <thead><tr>{analysis.inputs.map((input) => <th key={input.id}>{input.label}</th>)}{analysis.columns.map((column) => <th key={column.id}>{column.label}</th>)}</tr></thead>
              <tbody>{analysis.rows.map((row, index) => (
                <tr key={index} className={index === currentRow ? 'is-current' : ''}>
                  {analysis.inputs.map((input) => <td key={input.id}>{signalCell(row.values[input.id])}</td>)}
                  {analysis.columns.map((column) => <td key={column.id}>{signalCell(row.values[column.id])}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      <button className="button button--ghost button--wide" onClick={onClear}>Limpar seleção</button>
    </div>
  )
}

export function DigitalCircuitsStudio({ mode }: { mode: Mode }) {
  const initial = useMemo(() => initialCircuit(mode), [mode])
  const [nodes, setNodes] = useState<CircuitFlowNode[]>(initial.nodes)
  const [edges, setEdges] = useState<CircuitFlowEdge[]>(initial.edges)
  const [history, setHistory] = useState<CircuitSnapshot[]>([])
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<CircuitFlowNode, CircuitFlowEdge> | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [analysisMode, setAnalysisMode] = useState(false)
  const [notice, setNotice] = useState('')
  const [prediction, setPrediction] = useState<boolean | null>(null)
  const [predictionExpected, setPredictionExpected] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(mode === 'explore' || mode === 'sandbox')
  const counter = useRef(1)
  const challengeRecorded = useRef(false)
  const markComplete = useLearningStore((state) => state.markComplete)

  const elements = useMemo(() => toElements(nodes), [nodes])
  const connections = useMemo(() => toConnections(edges), [edges])
  const evaluation = useMemo(() => evaluateCircuit(elements, connections), [elements, connections])
  const selectionAnalysis = useMemo(
    () => analyzeCircuitSelection(elements, connections, selectedIds),
    [connections, elements, selectedIds],
  )
  const outputs = elements.filter((element) => element.kind === 'output')
  const mainOutput = outputs[0] ? evaluation.nodeValues[outputs[0].id] : 'X'

  const challengeSuccess = useMemo(() => {
    if (mode !== 'challenges') return false
    const expected: CircuitSignal[] = [0, 1, 1, 0]
    const actual = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => evaluateCircuit(elements, connections, { A: a as 0 | 1, B: b as 0 | 1 }).nodeValues.Y)
    return actual.every((value, index) => value === expected[index])
  }, [connections, elements, mode])

  useEffect(() => {
    if (mode !== 'sandbox') return
    const document: CircuitDocument = {
      schemaVersion: 1,
      nodes: nodes.map((node) => ({ ...node, selected: false, data: { ...node.data, signal: undefined, concealed: undefined } })),
      edges: edges.map((edge) => ({ ...edge, selected: false })),
    }
    localStorage.setItem(sandboxStorageKey, JSON.stringify(document))
  }, [edges, mode, nodes])

  useEffect(() => {
    if (!challengeSuccess || challengeRecorded.current) return
    challengeRecorded.current = true
    markComplete('digital-circuits-challenges')
    useLearningStore.getState().addJournal({
      topic: 'digital-circuits',
      kind: 'discovery',
      message: 'Construiu um circuito que reconhece exatamente um sinal ativo.',
    })
  }, [challengeSuccess, markComplete])

  const remember = useCallback(() => {
    setHistory((items) => [...items, { nodes: structuredClone(nodes), edges: structuredClone(edges) }].slice(-60))
  }, [edges, nodes])

  const updateNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => current === message ? '' : current), 4200)
  }

  const toggleInput = useCallback((id: string) => {
    remember()
    setNodes((current) => current.map((node) => node.id === id && node.data.kind === 'input'
      ? { ...node, data: { ...node.data, inputValue: node.data.inputValue === 1 ? 0 : 1 } }
      : node))
    journalAction('digital-circuits', 'Alternou um switch do circuito.')
  }, [remember])

  const clearSelection = () => {
    setSelectedIds([])
    setNodes((current) => current.map((node) => node.selected ? { ...node, selected: false } : node))
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setNodes(previous.nodes)
    setEdges(previous.edges)
    setHistory((items) => items.slice(0, -1))
    setSelectedIds([])
    journalAction('digital-circuits', 'Desfez a última alteração do circuito.')
  }

  const reset = () => {
    const fresh = clonePreset(mode)
    if (mode === 'sandbox') localStorage.removeItem(sandboxStorageKey)
    setNodes(fresh.nodes)
    setEdges(fresh.edges)
    setHistory([])
    setSelectedIds([])
    setAnalysisMode(false)
    setNotice('')
    setPrediction(null)
    setPredictionExpected(null)
    setRevealed(mode === 'explore' || mode === 'sandbox')
    challengeRecorded.current = false
    journalAction('digital-circuits', 'Reiniciou o circuito.')
    window.setTimeout(() => flowInstance?.fitView({ padding: 0.18 }), 0)
  }

  const makePaletteNode = (item: PaletteItem, position: { x: number; y: number }) => {
    const number = counter.current++
    const sameKind = nodes.filter((node) => node.data.kind === item.kind).length
    const label = item.kind === 'input'
      ? String.fromCharCode(65 + Math.min(sameKind, 25))
      : item.kind === 'gate'
        ? `${item.gate} ${number}`
        : item.kind === 'output'
          ? sameKind ? `Y${sameKind + 1}` : 'Y'
          : String(item.inputValue)
    return circuitNode(`${item.key}-${Date.now()}-${number}`, item.kind, label, position.x, position.y, { gate: item.gate, inputValue: item.inputValue })
  }

  const addPaletteItem = (item: PaletteItem, position?: { x: number; y: number }) => {
    remember()
    const fallback = { x: 70 + (nodes.length % 3) * 190, y: 70 + Math.floor(nodes.length / 3) * 130 }
    setNodes((current) => [...current, makePaletteNode(item, position ?? fallback)])
    journalAction('digital-circuits', `Adicionou ${item.label} ao circuito.`)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData('application/circuit-component')
    if (!raw || !flowInstance) return
    const item = JSON.parse(raw) as PaletteItem
    addPaletteItem(item, flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !connection.targetHandle) return
    if (connection.source === connection.target || wouldCreateCycle(connections, connection.source, connection.target)) {
      updateNotice('Essa ligação criaria um ciclo. O laboratório trabalha agora com circuitos combinacionais.')
      return
    }
    if (edges.some((edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle)) {
      updateNotice('Essa entrada já recebe um sinal. Remova o fio atual antes de conectar outro.')
      return
    }
    remember()
    const id = `wire-${connection.source}-${connection.target}-${connection.targetHandle}-${Date.now()}`
    setEdges((current) => [...current, wire(id, connection.source!, connection.target!, connection.targetHandle!)])
    journalAction('digital-circuits', 'Conectou dois componentes.')
  }

  const onNodesChange = (changes: NodeChange<CircuitFlowNode>[]) => {
    const removed = changes.filter((change) => change.type === 'remove').map((change) => change.id)
    if (removed.length) {
      remember()
      const ids = new Set(removed)
      setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)))
      journalAction('digital-circuits', 'Removeu um componente do circuito.')
    }
    setNodes((current) => applyNodeChanges(changes, current))
  }

  const onEdgesChange = (changes: EdgeChange<CircuitFlowEdge>[]) => {
    if (changes.some((change) => change.type === 'remove')) {
      remember()
      journalAction('digital-circuits', 'Removeu um fio do circuito.')
    }
    setEdges((current) => applyEdgeChanges(changes, current))
  }

  const renameSelected = (label: string) => {
    const id = selectedIds[0]
    if (!id) return
    setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node))
  }

  const submitPrediction = (value: boolean) => {
    const expected = mode === 'challenges' ? false : mainOutput === 1
    setPrediction(value)
    setPredictionExpected(expected)
    setRevealed(true)
    markComplete(`digital-circuits-${mode}`)
    useLearningStore.getState().addJournal({
      topic: 'digital-circuits',
      kind: 'prediction',
      message: `Previu ${value ? 'SIM' : 'NÃO'}; a evidência mostrou ${expected ? 'SIM' : 'NÃO'}.`,
    })
  }

  const displaySignals = revealed || (mode !== 'learn' && mode !== 'challenges')
  const flowNodes = useMemo(() => nodes.map((node) => ({
    ...node,
    data: { ...node.data, signal: evaluation.nodeValues[node.id], concealed: !displaySignals },
  })), [displaySignals, evaluation.nodeValues, nodes])
  const flowEdges = useMemo(() => edges.map((edge) => {
    const signal = evaluation.wireValues[edge.id]
    const color = !displaySignals ? '#9aa7b8' : signal === 1 ? '#168a62' : signal === 0 ? '#77869a' : '#d28a18'
    return { ...edge, animated: displaySignals && signal === 1, style: { stroke: color, strokeWidth: signal === 1 ? 3 : 2.2 } }
  }), [displaySignals, edges, evaluation.wireValues])

  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: CircuitFlowNode[] }) => {
    const next = selected.map((node) => node.id).sort()
    setSelectedIds((current) => current.length === next.length && current.every((id, index) => id === next[index]) ? current : next)
  }, [])

  const selectedNode = selectedIds.length === 1 ? nodes.find((node) => node.id === selectedIds[0]) : undefined

  let inspector
  if (analysisMode) {
    inspector = <SelectionInspector analysis={selectionAnalysis} evaluation={evaluation} onClose={() => setAnalysisMode(false)} onClear={clearSelection} />
  } else if (!revealed && (mode === 'learn' || mode === 'challenges')) {
    inspector = <PredictionPanel
      question={mode === 'challenges'
        ? 'A porta OR atende à regra “exatamente um switch ligado” em todos os casos?'
        : 'Com a porta fechada e o botão ainda solto, a máquina será ligada?'}
      onSubmit={submitPrediction}
    />
  } else {
    inspector = (
      <div className="investigation circuit-inspector">
        {prediction !== null && (
          <div className={`feedback-note ${prediction === predictionExpected ? 'is-success' : 'is-review'}`}>
            <strong>{prediction === predictionExpected ? 'Previsão confirmada' : 'A evidência mudou a conclusão'}</strong>
            <span>{mode === 'challenges' ? 'OR também liga quando os dois sinais são 1, portanto não representa “exatamente um”.' : 'A porta AND exige que as duas condições estejam ligadas ao mesmo tempo.'}</span>
          </div>
        )}

        {mode === 'challenges' && (
          <div className={`challenge-banner ${challengeSuccess ? 'is-success' : ''}`}>
            <strong>{challengeSuccess ? 'Objetivo atingido' : 'Missão: exatamente um'}</strong>
            <span>{challengeSuccess ? 'Sua saída segue 0, 1, 1, 0 para 00, 01, 10 e 11.' : 'Substitua ou reconstrua o circuito até obter o comportamento da XOR.'}</span>
          </div>
        )}

        <div className="eyebrow">Estado das saídas</div>
        <div className="circuit-output-list">
          {outputs.length ? outputs.map((output) => {
            const signal = evaluation.nodeValues[output.id]
            return <div key={output.id} className={`circuit-output-card is-${signal === 'X' ? 'unknown' : signal === 1 ? 'on' : 'off'}`}><Lightbulb size={20} /><span><small>{output.label}</small><strong>{signalLabel(signal)}</strong></span></div>
          }) : <p className="muted">Adicione uma lâmpada para observar a saída do circuito.</p>}
        </div>

        {outputs.map((output) => (
          <div className="circuit-expression-card" key={output.id}><span>Expressão de {output.label}</span><strong>{circuitExpression(elements, connections, output.id)}</strong></div>
        ))}

        {selectedNode && (
          <label className="circuit-label-editor">Nome do componente<input value={selectedNode.data.label} maxLength={28} onChange={(event) => renameSelected(event.target.value)} /></label>
        )}

        {notice && <div className="feedback-note is-review"><strong>Ligação não realizada</strong><span>{notice}</span></div>}

        {evaluation.diagnostics.length > 0 && (
          <section className="circuit-diagnostics">
            <h3>O que falta resolver?</h3>
            {evaluation.diagnostics.slice(0, 4).map((diagnostic) => <div key={diagnostic.id}><AlertTriangle size={15} /><span><strong>{diagnostic.title}</strong><small>{diagnostic.explanation}</small></span></div>)}
          </section>
        )}

        {evaluation.trace.length > 0 && (
          <section className="trace-panel circuit-trace">
            <div className="eyebrow"><Cable size={13} /> Rastro do sinal</div>
            {evaluation.trace.map((step, index) => <div className="trace-step" key={`${step.nodeId}-${index}`}><span>{step.signal}</span><div><strong>{step.label} = {step.signal}</strong><p>{step.explanation}</p></div></div>)}
          </section>
        )}
      </div>
    )
  }

  const stage = (
    <div className="lab-card circuit-lab">
      <div className="lab-toolbar circuit-toolbar">
        <div><strong>Editor de circuitos combinacionais</strong><span>{nodes.length} componentes · {edges.length} fios</span></div>
        <div className="inline-actions">
          <button className={`button button--secondary${analysisMode ? ' is-active' : ''}`} onClick={() => setAnalysisMode((value) => !value)}><Binary size={15} /> {analysisMode ? 'Analisando seleção' : 'Analisar seleção'}</button>
          <button className="icon-button" onClick={() => { remember(); setNodes([]); setEdges([]); clearSelection() }} disabled={!nodes.length} aria-label="Limpar canvas"><Trash2 size={17} /></button>
        </div>
      </div>
      <div className="circuit-workbench">
        <aside className="circuit-palette" aria-label="Biblioteca de componentes">
          {paletteGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <div className="circuit-palette__items">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    draggable
                    onDragStart={(event) => { event.dataTransfer.setData('application/circuit-component', JSON.stringify(item)); event.dataTransfer.effectAllowed = 'copy' }}
                    onClick={() => addPaletteItem(item)}
                    title={`Arraste ou clique para adicionar ${item.label}`}
                  >
                    <GripVertical size={13} />
                    <span className="circuit-palette__glyph">
                      {item.kind === 'gate' && item.gate
                        ? <LogicGateSymbol gate={item.gate} compact />
                        : item.kind === 'input' ? '⏻' : item.kind === 'constant' ? item.inputValue : '◉'}
                    </span>
                    <strong>{item.label}</strong>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>
        <div className={`circuit-canvas${analysisMode ? ' is-selecting' : ''}`} onDrop={onDrop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}>
          {!nodes.length && <div className="circuit-canvas__empty"><Cable size={30} /><strong>Comece por uma entrada</strong><span>Arraste um switch, uma porta e uma lâmpada para o canvas.</span></div>}
          {analysisMode && <div className="circuit-selection-tip"><MousePointer2 size={14} /> Arraste uma área ou use Shift para selecionar várias portas</div>}
          <CircuitNodeActionsContext.Provider value={{ toggleInput }}>
            <ReactFlow<CircuitFlowNode, CircuitFlowEdge>
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={circuitNodeTypes}
              onInit={setFlowInstance}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onNodeDragStart={remember}
              selectionOnDrag={analysisMode}
              panOnDrag={!analysisMode}
              multiSelectionKeyCode="Shift"
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.42}
              maxZoom={1.8}
              snapToGrid
              snapGrid={[16, 16]}
              aria-label="Editor visual de circuitos digitais"
            >
              <Background gap={24} size={1} color="#d9e3ed" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </CircuitNodeActionsContext.Provider>
        </div>
      </div>
    </div>
  )

  return (
    <StudioScaffold
      eyebrow={mode === 'learn' ? 'Missão 8 · Sinais e condições' : mode === 'explore' ? 'Cenário preparado · Sistema de alarme' : mode === 'sandbox' ? 'Laboratório aberto' : 'Desafio · Função XOR'}
      title={presets[mode].title}
      description={presets[mode].description}
      controls={<div className="inline-actions"><button className="icon-button" onClick={undo} disabled={!history.length} aria-label="Desfazer"><Undo2 size={18} /></button><button className="icon-button" onClick={reset} aria-label="Reiniciar circuito"><RotateCcw size={18} /></button></div>}
      stage={stage}
      inspector={inspector}
      footer={<><div className="footer-status">{challengeSuccess ? <CheckCircle2 size={16} /> : <Sparkles size={16} />} {mode === 'sandbox' ? 'Rascunho salvo automaticamente neste dispositivo.' : analysisMode ? 'A tabela é recalculada a cada conexão.' : 'Selecione uma porta para renomear ou analisar.'}</div><button className="button button--ghost" onClick={() => setAnalysisMode(true)}>O que acontece se…?</button></>}
    />
  )
}
