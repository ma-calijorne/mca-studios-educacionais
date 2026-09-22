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
      style={{ top: count === 1 ? '50%' : `${35 + index * 30}%` }}
      aria-label={`Entrada ${index + 1}`}
    />
  ))}</>
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
      <div className="circuit-gate-shape"><strong>{gate}</strong><span>{data.label}</span></div>
      <span className="circuit-node__signal">{data.concealed ? '?' : data.signal ?? 'X'}</span>
      <Handle id="out" type="source" position={Position.Right} aria-label="Saída" />
    </div>
  )
}

export const circuitNodeTypes = {
  input: CircuitNodeView,
  constant: CircuitNodeView,
  gate: CircuitNodeView,
  output: CircuitNodeView,
}
