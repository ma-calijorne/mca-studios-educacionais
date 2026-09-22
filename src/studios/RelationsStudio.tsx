import { useCallback, useMemo, useState } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Plus, RotateCcw, Sparkles, Trash2, Undo2 } from 'lucide-react'
import type { Mode } from '../core/types'
import { journalAction, useLearningStore } from '../core/store'
import { analyzeRelation, type Pair } from '../engines/relations'
import { AnalysisCard } from '../components/AnalysisCard'
import { MathExpression } from '../components/MathExpression'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'

interface RelationsStudioProps { mode: Mode }

interface RelationPreset {
  elements: string[]
  pairs: Pair[]
  title: string
  description: string
}

const presets: Record<Mode, RelationPreset> = {
  learn: {
    elements: ['Ana', 'Bruno', 'Carla'],
    pairs: [{ from: 'Ana', to: 'Bruno' }, { from: 'Bruno', to: 'Carla' }],
    title: 'A cadeia está completa?',
    description: 'Ana é mais alta que Bruno, e Bruno é mais alto que Carla. Investigue o padrão antes de formalizá-lo.',
  },
  explore: {
    elements: ['1', '2', '3'],
    pairs: [
      { from: '1', to: '1' }, { from: '2', to: '2' }, { from: '3', to: '3' },
      { from: '1', to: '2' }, { from: '1', to: '3' }, { from: '2', to: '3' },
    ],
    title: 'Ordem numérica sob a lente',
    description: 'A relação “menor ou igual” combina propriedades que nem sempre aparecem juntas. Altere uma seta e observe.',
  },
  sandbox: {
    elements: ['A', 'B', 'C'],
    pairs: [],
    title: 'Construa sua própria relação',
    description: 'Crie elementos e pares. Cada alteração é explicada por testemunhos e contraexemplos.',
  },
  challenges: {
    elements: ['A', 'B', 'C'],
    pairs: [
      { from: 'A', to: 'A' }, { from: 'B', to: 'B' }, { from: 'C', to: 'C' },
      { from: 'A', to: 'B' }, { from: 'B', to: 'A' },
    ],
    title: 'Repare sem perder a reflexividade',
    description: 'Remova exatamente uma seta para tornar a relação antissimétrica sem perder a reflexividade.',
  },
}

const positions = [
  { x: 90, y: 80 },
  { x: 370, y: 80 },
  { x: 230, y: 270 },
  { x: 510, y: 270 },
  { x: 90, y: 350 },
  { x: 370, y: 350 },
]

const pairKey = (pair: Pair) => `${pair.from}→${pair.to}`

function toNodes(elements: string[]): Node[] {
  return elements.map((label, index) => ({
    id: label,
    position: positions[index] ?? { x: 120 + (index % 3) * 180, y: 80 + Math.floor(index / 3) * 170 },
    data: { label },
    className: 'relation-node',
    ariaLabel: `Elemento ${label}`,
  }))
}

function toEdges(pairs: Pair[]): Edge[] {
  return pairs.map((pair) => ({
    id: pairKey(pair),
    source: pair.from,
    target: pair.to,
    markerEnd: { type: MarkerType.ArrowClosed },
    type: pair.from === pair.to ? 'default' : 'smoothstep',
    className: 'relation-edge',
    ariaLabel: `${pair.from} se relaciona com ${pair.to}`,
  }))
}

export function RelationsStudio({ mode }: RelationsStudioProps) {
  const preset = presets[mode]
  const [elements, setElements] = useState(preset.elements)
  const [pairs, setPairs] = useState<Pair[]>(preset.pairs)
  const [history, setHistory] = useState<Pair[][]>([])
  const [nodes, setNodes] = useState<Node[]>(() => toNodes(preset.elements))
  const [origin, setOrigin] = useState(preset.elements[0] ?? '')
  const [target, setTarget] = useState(preset.elements[1] ?? preset.elements[0] ?? '')
  const [activeProperty, setActiveProperty] = useState('transitive')
  const [prediction, setPrediction] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(mode === 'sandbox' || mode === 'explore')
  const [challengeActions, setChallengeActions] = useState(0)
  const addJournal = useLearningStore((state) => state.addJournal)

  const analysis = useMemo(() => analyzeRelation(elements, pairs), [elements, pairs])
  const results = [analysis.reflexive, analysis.symmetric, analysis.antisymmetric, analysis.transitive, analysis.equivalence]
  const active = results.find((result) => result.id === activeProperty) ?? analysis.transitive
  const edges = useMemo(() => toEdges(pairs), [pairs])

  const commitPairs = useCallback((next: Pair[], message: string) => {
    setHistory((items) => [...items, pairs])
    setPairs(next)
    setChallengeActions((value) => value + 1)
    journalAction('relations', message)
  }, [pairs])

  const addPair = useCallback((from: string, to: string) => {
    if (!from || !to || pairs.some((pair) => pair.from === from && pair.to === to)) return
    commitPairs([...pairs, { from, to }], `Adicionou ${from}→${to}.`)
  }, [commitPairs, pairs])

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) addPair(connection.source, connection.target)
  }, [addPair])

  const removePair = (pair: Pair) => {
    commitPairs(pairs.filter((candidate) => pairKey(candidate) !== pairKey(pair)), `Removeu ${pair.from}→${pair.to}.`)
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setPairs(previous)
    setHistory((items) => items.slice(0, -1))
    journalAction('relations', 'Desfez a última alteração.')
  }

  const reset = () => {
    setElements(preset.elements)
    setPairs(preset.pairs)
    setNodes(toNodes(preset.elements))
    setHistory([])
    setPrediction(null)
    setRevealed(mode === 'sandbox' || mode === 'explore')
    setChallengeActions(0)
    journalAction('relations', 'Reiniciou o cenário.')
  }

  const addElement = () => {
    if (elements.length >= 8) return
    const base = String.fromCharCode(65 + elements.length)
    let label = base
    let suffix = 2
    while (elements.includes(label)) label = `${base}${suffix++}`
    const nextElements = [...elements, label]
    setElements(nextElements)
    setNodes(toNodes(nextElements))
    setOrigin(label)
    setTarget(label)
    journalAction('relations', `Adicionou o elemento ${label}.`)
  }

  const onPrediction = (value: boolean) => {
    setPrediction(value)
    setRevealed(true)
    setActiveProperty(mode === 'challenges' ? 'antisymmetric' : 'transitive')
    addJournal({ topic: 'relations', kind: 'prediction', message: `Previu ${value ? 'SIM' : 'NÃO'} para ${mode === 'challenges' ? 'antissimetria' : 'transitividade'}.` })
  }

  const challengeSuccess = mode === 'challenges' && challengeActions === 1 && analysis.antisymmetric.value && analysis.reflexive.value
  const question = mode === 'challenges'
    ? 'A relação atual já é antissimétrica?'
    : 'A relação atual é transitiva?'

  const graphStage = (
    <div className="canvas-card">
      <div className="canvas-card__toolbar">
        <div>
          <strong>Relação sobre A</strong>
          <span>A = {'{'}{elements.join(', ')}{'}'}</span>
        </div>
        <div className="view-switcher" aria-label="Representação atual">
          <button className="is-active">Grafo</button>
          <button onClick={() => document.getElementById('pair-list')?.focus()}>Pares</button>
        </div>
      </div>
      <div className="relation-canvas" aria-label="Editor visual da relação">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            setNodes((current) => {
              const byId = new Map(current.map((node) => [node.id, node]))
              for (const change of changes) {
                if (change.type === 'position' && change.position) {
                  const node = byId.get(change.id)
                  if (node) byId.set(change.id, { ...node, position: change.position })
                }
              }
              return [...byId.values()]
            })
          }}
          onConnect={onConnect}
          onEdgesDelete={(deleted) => {
            const ids = new Set(deleted.map((edge) => edge.id))
            commitPairs(pairs.filter((pair) => !ids.has(pairKey(pair))), 'Removeu uma seta pelo grafo.')
          }}
          fitView
          minZoom={0.6}
          maxZoom={1.7}
          deleteKeyCode={['Backspace', 'Delete']}
          aria-label="Grafo dirigido editável"
        >
          <Background gap={24} size={1} color="#dbe4f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="pair-composer">
        <label>Origem<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{elements.map((item) => <option key={item}>{item}</option>)}</select></label>
        <ArrowRight size={18} aria-hidden="true" />
        <label>Destino<select value={target} onChange={(event) => setTarget(event.target.value)}>{elements.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="button button--secondary" onClick={() => addPair(origin, target)}><Plus size={16} /> Adicionar par</button>
        {mode === 'sandbox' && <button className="button button--ghost" onClick={addElement} disabled={elements.length >= 8}><Plus size={16} /> Elemento</button>}
      </div>
      <div className="pair-list" id="pair-list" tabIndex={-1}>
        <span className="pair-list__label">R =</span>
        {pairs.length === 0 ? <span className="muted">Nenhum par — experimente criar o primeiro.</span> : pairs.map((pair) => (
          <span className="pair-chip" key={pairKey(pair)}>
            ({pair.from}, {pair.to})
            <button aria-label={`Remover ${pair.from} para ${pair.to}`} onClick={() => removePair(pair)}><Trash2 size={13} /></button>
          </span>
        ))}
      </div>
    </div>
  )

  const inspector = !revealed ? (
    <PredictionPanel question={question} onSubmit={onPrediction} />
  ) : (
    <div className="investigation">
      {prediction !== null && (
        <div className="prediction-summary">
          <span>Sua previsão</span>
          <strong>{prediction ? 'SIM' : 'NÃO'}</strong>
          <span className={prediction === active.value ? 'prediction-match' : 'prediction-mismatch'}>
            {prediction === active.value ? 'Confirmada' : 'Revisada pela evidência'}
          </span>
        </div>
      )}
      {mode === 'challenges' && (
        <div className={`challenge-banner ${challengeSuccess ? 'is-success' : ''}`}>
          <strong>{challengeSuccess ? 'Objetivo atingido' : `Ações realizadas: ${challengeActions}/1`}</strong>
          <span>{challengeSuccess ? 'Você eliminou a reciprocidade e preservou todos os laços.' : 'Remova exatamente uma seta e examine o impacto.'}</span>
        </div>
      )}
      <div className="analysis-list">
        {results.map((result) => <AnalysisCard key={result.id} result={result} active={activeProperty === result.id} onClick={() => setActiveProperty(result.id)} />)}
      </div>
      <AnimatePresence mode="wait">
        <motion.section
          key={`${active.id}-${active.value}-${pairs.length}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="evidence-card"
        >
          <div className="eyebrow">Por quê?</div>
          <h3>{active.summary}</h3>
          {active.evidence[0] ? (
            <>
              <strong>{active.evidence[0].title}</strong>
              <p>{active.evidence[0].explanation}</p>
            </>
          ) : <p>Observe as três propriedades necessárias em conjunto.</p>}
          {active.id === 'transitive' && (
            <div className="formalization">
              <span>Formalização</span>
              <MathExpression block value="(a,b)\\in R \\land (b,c)\\in R \\Rightarrow (a,c)\\in R" label="Se a se relaciona com b e b com c, então a se relaciona com c" />
            </div>
          )}
          {active.id === 'antisymmetric' && (
            <div className="formalization">
              <span>Formalização</span>
              <MathExpression block value="(a,b)\\in R \\land (b,a)\\in R \\Rightarrow a=b" label="Se a se relaciona com b e b com a, então a e b são iguais" />
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  )

  return (
    <StudioScaffold
      eyebrow={mode === 'learn' ? 'Missão 5 de 6 · Transitividade' : mode === 'challenges' ? 'Nível 3 · Análise' : mode === 'sandbox' ? 'Laboratório aberto' : 'Cenário preparado · Ordem parcial'}
      title={preset.title}
      description={preset.description}
      controls={
        <div className="inline-actions">
          <button className="icon-button" onClick={undo} disabled={!history.length} aria-label="Desfazer"><Undo2 size={18} /></button>
          <button className="icon-button" onClick={reset} aria-label="Reiniciar cenário"><RotateCcw size={18} /></button>
        </div>
      }
      stage={graphStage}
      inspector={inspector}
      footer={
        <>
          <div className="footer-status"><Sparkles size={16} /> {revealed ? 'Análise atualizada a cada alteração.' : 'O resultado permanece oculto até sua previsão.'}</div>
          <button className="button button--ghost" onClick={() => setActiveProperty('transitive')}>O que acontece se…?</button>
        </>
      }
    />
  )
}
