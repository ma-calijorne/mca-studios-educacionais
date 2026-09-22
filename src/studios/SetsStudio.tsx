import { useMemo, useState } from 'react'
import { Check, Plus, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import type { Mode } from '../core/types'
import { journalAction, useLearningStore } from '../core/store'
import { calculateSetOperation, explainSetItem, type SetOperation, type SetScenario } from '../engines/sets'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'

const operationLabels: Record<SetOperation, string> = {
  union: 'A ∪ B', intersection: 'A ∩ B', 'a-minus-b': 'A − B', 'b-minus-a': 'B − A',
  'complement-a': 'Aᶜ', cartesian: 'A × B', power: '𝒫(A)',
}

const initialScenarios: Record<Mode, SetScenario> = {
  learn: { universe: ['1', '2', '3', '4', '5', '6'], a: ['1', '2', '4'], b: ['2', '3', '4'], c: [] },
  explore: { universe: ['a', 'b', 'c', 'd', 'e', 'f'], a: ['a', 'c', 'e'], b: ['b', 'c', 'd'], c: [] },
  sandbox: { universe: ['x', 'y', 'z'], a: ['x'], b: ['y'], c: [] },
  challenges: { universe: ['1', '2', '3', '4', '5'], a: ['1', '2', '3'], b: ['2', '3', '4'], c: [] },
}

export function SetsStudio({ mode }: { mode: Mode }) {
  const initial = initialScenarios[mode]
  const [scenario, setScenario] = useState(initial)
  const [history, setHistory] = useState<SetScenario[]>([])
  const [operation, setOperation] = useState<SetOperation>(mode === 'challenges' ? 'intersection' : 'union')
  const [selected, setSelected] = useState(initial.universe[0])
  const [prediction, setPrediction] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(mode === 'explore' || mode === 'sandbox')
  const [newItem, setNewItem] = useState('')
  const markComplete = useLearningStore((state) => state.markComplete)
  const result = useMemo(() => calculateSetOperation(scenario, operation), [scenario, operation])
  const simpleResult = !['cartesian', 'power'].includes(operation)

  const commit = (next: SetScenario, message: string) => {
    setHistory((current) => [...current, scenario])
    setScenario(next)
    journalAction('sets', message)
  }
  const toggle = (setName: 'a' | 'b', item: string) => {
    const values = scenario[setName]
    commit({ ...scenario, [setName]: values.includes(item) ? values.filter((value) => value !== item) : [...values, item] }, `${item} ${values.includes(item) ? 'saiu de' : 'entrou em'} ${setName.toUpperCase()}.`)
    setSelected(item)
  }
  const addItem = () => {
    const item = newItem.trim()
    if (!item || scenario.universe.includes(item)) return
    commit({ ...scenario, universe: [...scenario.universe, item] }, `Adicionou ${item} ao universo.`)
    setSelected(item)
    setNewItem('')
  }
  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setScenario(previous)
    setHistory((current) => current.slice(0, -1))
  }
  const reset = () => {
    setScenario(initial)
    setHistory([])
    setPrediction(null)
    setRevealed(mode === 'explore' || mode === 'sandbox')
  }
  const submitPrediction = (value: boolean) => {
    setPrediction(value)
    setRevealed(true)
    markComplete(`sets-${mode}`)
    useLearningStore.getState().addJournal({ topic: 'sets', kind: 'prediction', message: `Previu que 3 ${value ? 'pertence' : 'não pertence'} ao resultado.` })
  }

  const stage = (
    <div className="lab-card set-lab">
      <div className="lab-toolbar">
        <div><strong>Universo U</strong><span>{'{'}{scenario.universe.join(', ')}{'}'}</span></div>
        <label>Operação<select value={operation} onChange={(event) => setOperation(event.target.value as SetOperation)}>{Object.entries(operationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      </div>
      <div className="set-board">
        <div className="set-board__legend"><span className="legend-a">Conjunto A</span><span className="legend-b">Conjunto B</span><span className="legend-result">Resultado {operationLabels[operation]}</span></div>
        <div className="element-grid">
          {scenario.universe.map((item) => {
            const inA = scenario.a.includes(item)
            const inB = scenario.b.includes(item)
            const inResult = simpleResult && result.includes(item)
            return <button key={item} className={`element-token${inResult ? ' is-result' : ''}${selected === item ? ' is-selected' : ''}`} onClick={() => setSelected(item)}>
              <strong>{item}</strong><span className="membership-dots"><i className={inA ? 'is-on a' : 'a'} /><i className={inB ? 'is-on b' : 'b'} /></span>
              {inResult && <Check size={15} />}
            </button>
          })}
        </div>
        <div className="set-editor">
          <h3>Edite a pertença</h3>
          <p>Selecione um elemento e altere os conjuntos. O resultado responde imediatamente.</p>
          <div className="membership-actions">
            <button className={scenario.a.includes(selected) ? 'is-active a' : ''} onClick={() => toggle('a', selected)}>A {scenario.a.includes(selected) ? '✓' : '+'}</button>
            <button className={scenario.b.includes(selected) ? 'is-active b' : ''} onClick={() => toggle('b', selected)}>B {scenario.b.includes(selected) ? '✓' : '+'}</button>
          </div>
          {mode === 'sandbox' && <div className="inline-input"><input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Novo elemento" onKeyDown={(event) => event.key === 'Enter' && addItem()} /><button className="icon-button" onClick={addItem} aria-label="Adicionar elemento"><Plus size={17} /></button></div>}
        </div>
      </div>
      <div className="result-strip"><span>{operationLabels[operation]} =</span><strong>{'{'}{result.join(', ')}{'}'}</strong></div>
    </div>
  )

  const question = mode === 'challenges' ? 'O elemento 3 pertence a A ∩ B?' : 'O elemento 3 aparecerá no resultado atual?'
  const expected = result.includes('3')
  const inspector = !revealed ? <PredictionPanel question={question} onSubmit={submitPrediction} /> : (
    <div className="investigation">
      <div className="eyebrow">Evidência de pertença</div>
      <div className="big-result"><span>{operationLabels[operation]}</span><strong>{result.length}</strong><small>{result.length === 1 ? 'elemento' : 'elementos'}</small></div>
      {prediction !== null && <div className={`feedback-note ${prediction === expected ? 'is-success' : 'is-review'}`}><strong>{prediction === expected ? 'Previsão confirmada' : 'Boa revisão'}</strong><span>O resultado foi determinado pela pertença, não pela posição visual.</span></div>}
      <section className="explanation-panel"><h3>Por que {selected} {result.includes(selected) ? 'aparece' : 'não aparece'}?</h3><p>{explainSetItem(selected, scenario, operation)}</p></section>
      <div className="set-membership-table"><div><span>Em A</span><strong>{scenario.a.includes(selected) ? 'SIM' : 'NÃO'}</strong></div><div><span>Em B</span><strong>{scenario.b.includes(selected) ? 'SIM' : 'NÃO'}</strong></div><div><span>No resultado</span><strong>{result.includes(selected) ? 'SIM' : 'NÃO'}</strong></div></div>
      <div className="formalization"><span>Leitura formal</span><p>{operation === 'union' ? 'x ∈ A ∪ B ⇔ x ∈ A ou x ∈ B' : operation === 'intersection' ? 'x ∈ A ∩ B ⇔ x ∈ A e x ∈ B' : `A operação ${operationLabels[operation]} foi calculada elemento a elemento.`}</p></div>
    </div>
  )

  return <StudioScaffold eyebrow={mode === 'learn' ? 'Missão 1 · Pertença e operações' : mode === 'sandbox' ? 'Laboratório aberto' : mode === 'challenges' ? 'Nível 2 · Aplicação' : 'Cenário preparado'} title={mode === 'challenges' ? 'Interseção sem adivinhação' : 'Quem pertence ao resultado?'} description="Manipule a pertença de cada elemento e acompanhe como uma operação transforma coleções." controls={<div className="inline-actions"><button className="icon-button" disabled={!history.length} onClick={undo} aria-label="Desfazer"><Undo2 size={18} /></button><button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button></div>} stage={stage} inspector={inspector} footer={<div className="footer-status"><Sparkles size={16} /> Clique em um elemento para ver a justificativa individual.</div>} />
}
