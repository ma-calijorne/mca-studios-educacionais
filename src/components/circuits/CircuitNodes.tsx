import { createContext, useContext, type MouseEvent } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Lightbulb, Power } from 'lucide-react'
import { gateInputCount, type CircuitSignal, type GateKind } from '../../engines/circuits'

export interface CircuitNodeData extends Record<string, unknown> {
  kind: 'input' | 'constant' | 'gate' | 'output'
  label: string
  gate?: GateKind
  inputValue?: 0 | 1
  signal?: CircuitSignal
  concealed?: boolean
}

export type CircuitFlowNode = Node<CircuitNodeData, CircuitNodeData['kind']>

interface CircuitNodeActions {
  toggleInput: (id: string) => void
}

export const CircuitNodeActionsContext = createContext<CircuitNodeActions>({ toggleInput: () => undefined })

function signalClass(signal: CircuitSignal | undefined, concealed: boolean | undefined) {
  if (concealed || signal === undefined) return 'is-concealed'
  return signal === 1 ? 'is-on' : signal === 0 ? 'is-off' : 'is-unknown'
}

function InputHandles({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, index) => (
    <Handle
      key={index}
      id={`in-${index}`}
      type="target"
      position={Position.Left}
      style={{ top: count === 1 ? '42px' : `${28 + index * 28}px` }}
      aria-label={`Entrada ${index + 1}`}
    />
  ))}</>
}

export function LogicGateSymbol({ gate, compact = false }: { gate: GateKind; compact?: boolean }) {
  const baseGate = gate === 'NAND' ? 'AND' : gate === 'NOR' ? 'OR' : gate === 'XNOR' ? 'XOR' : gate
  const inverted = gate === 'NOT' || gate === 'NAND' || gate === 'NOR' || gate === 'XNOR'
  const binary = gate !== 'NOT'
  const outputTip = baseGate === 'NOT' ? 104 : 110
  const bubbleCenter = baseGate === 'NOT' ? 112 : 118
  const leadStart = inverted ? bubbleCenter + 7 : outputTip

  return (
    <svg
      className={`circuit-gate-symbol${compact ? ' is-compact' : ''}`}
      viewBox="0 0 140 84"
      aria-hidden="true"
      focusable="false"
    >
      <g className="circuit-gate-symbol__leads">
        {binary ? <><path d="M 0 28 H 31" /><path d="M 0 56 H 31" /></> : <path d="M 0 42 H 26" />}
        <path d={`M ${leadStart} 42 H 140`} />
      </g>

      {baseGate === 'AND' && <path className="circuit-gate-symbol__body" d="M 24 14 H 62 C 90 14 110 26 110 42 C 110 58 90 70 62 70 H 24 Z" />}
      {(baseGate === 'OR' || baseGate === 'XOR') && (
        <path className="circuit-gate-symbol__body" d="M 26 14 C 60 14 91 20 110 42 C 91 64 60 70 26 70 C 39 53 39 31 26 14 Z" />
      )}
      {baseGate === 'XOR' && <path className="circuit-gate-symbol__xor" d="M 17 14 C 30 31 30 53 17 70" />}
      {baseGate === 'NOT' && <path className="circuit-gate-symbol__body" d="M 26 12 L 104 42 L 26 72 Z" />}
      {inverted && <circle className="circuit-gate-symbol__bubble" cx={bubbleCenter} cy="42" r="6.5" />}

      {!compact && <text className="circuit-gate-symbol__text" x={baseGate === 'NOT' ? 62 : 68} y="46">{gate}</text>}
    </svg>
  )
}

export function CircuitNodeView({ id, data, selected }: NodeProps<CircuitFlowNode>) {
  const actions = useContext(CircuitNodeActionsContext)
  const stateClass = signalClass(data.signal, data.concealed)
  const stopAndToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    actions.toggleInput(id)
  }

  if (data.kind === 'input') {
    return (
      <div className={`circuit-node circuit-node--input ${stateClass}${selected ? ' is-selected' : ''}`}>
        <span className="circuit-node__label">{data.label}</span>
        <button className="circuit-switch nodrag" onClick={stopAndToggle} aria-label={`Alternar ${data.label}`} aria-pressed={data.inputValue === 1}>
          <Power size={15} /><strong>{data.inputValue ?? 0}</strong>
        </button>
        <Handle id="out" type="source" position={Position.Right} aria-label="Saída" />
      </div>
    )
  }

  if (data.kind === 'constant') {
    return (
      <div className={`circuit-node circuit-node--constant ${stateClass}${selected ? ' is-selected' : ''}`}>
        <span className="circuit-node__label">Constante</span>
        <strong className="circuit-constant">{data.inputValue ?? 0}</strong>
        <Handle id="out" type="source" position={Position.Right} aria-label="Saída" />
      </div>
    )
  }

  if (data.kind === 'output') {
    return (
      <div className={`circuit-node circuit-node--output ${stateClass}${selected ? ' is-selected' : ''}`}>
        <Handle id="in-0" type="target" position={Position.Left} aria-label="Entrada" />
        <Lightbulb className="circuit-lamp" size={34} aria-hidden="true" />
        <span className="circuit-node__label">{data.label}</span>
        <strong className="circuit-node__signal">{data.concealed ? '?' : data.signal ?? 'X'}</strong>
      </div>
    )
  }

  const gate = data.gate ?? 'AND'
  return (
    <div className={`circuit-node circuit-node--gate circuit-node--${gate.toLowerCase()} ${stateClass}${selected ? ' is-selected' : ''}`}>
      <InputHandles count={gateInputCount(gate)} />
      <LogicGateSymbol gate={gate} />
      <span className="circuit-gate-caption">{data.label}</span>
      <span className="circuit-node__signal">{data.concealed ? '?' : data.signal ?? 'X'}</span>
      <Handle id="out" type="source" position={Position.Right} style={{ top: '42px' }} aria-label="Saída" />
    </div>
  )
}

export const circuitNodeTypes = {
  input: CircuitNodeView,
  constant: CircuitNodeView,
  gate: CircuitNodeView,
  output: CircuitNodeView,
}
