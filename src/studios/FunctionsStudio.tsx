import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Plus, RotateCcw, Sparkles, Trash2, Undo2 } from 'lucide-react'
import type { Mode } from '../core/types'
import { journalAction, useLearningStore } from '../core/store'
import { analyzeFunction } from '../engines/functions'
import type { Pair } from '../engines/relations'
import { AnalysisCard } from '../components/AnalysisCard'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'

const presets: Record<Mode, { domain: string[]; codomain: string[]; pairs: Pair[] }> = {
  learn: { domain: ['Ana', 'Beto', 'Caio'], codomain: ['Azul', 'Verde', 'Roxo'], pairs: [{ from: 'Ana', to: 'Azul' }, { from: 'Beto', to: 'Verde' }, { from: 'Caio', to: 'Verde' }] },
  explore: { domain: ['1', '2', '3'], codomain: ['2', '4', '6'], pairs: [{ from: '1', to: '2' }, { from: '2', to: '4' }, { from: '3', to: '6' }] },
  sandbox: { domain: ['x₁', 'x₂', 'x₃'], codomain: ['y₁', 'y₂', 'y₃'], pairs: [] },
  challenges: { domain: ['A', 'B', 'C'], codomain: ['1', '2', '3'], pairs: [{ from: 'A', to: '1' }, { from: 'B', to: '1' }, { from: 'C', to: '2' }] },
}

interface MappingConnection {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
}

function MappingBoard({ domain, codomain, pairs }: { domain: string[]; codomain: string[]; pairs: Pair[] }) {
  const boardRef = useRef<HTMLDivElement>(null)
  const domainRefs = useRef(new Map<string, HTMLDivElement>())
  const codomainRefs = useRef(new Map<string, HTMLDivElement>())
  const [connections, setConnections] = useState<MappingConnection[]>([])

  const measureConnections = useCallback(() => {
    const board = boardRef.current?.getBoundingClientRect()
    if (!board) return
    setConnections(pairs.flatMap((pair, index) => {
      const source = domainRefs.current.get(pair.from)?.getBoundingClientRect()
      const target = codomainRefs.current.get(pair.to)?.getBoundingClientRect()
      if (!source || !target) return []
      return [{
        id: `${pair.from}-${pair.to}-${index}`,
        startX: source.right - board.left,
        startY: source.top + source.height / 2 - board.top,
        endX: target.left - board.left,
        endY: target.top + target.height / 2 - board.top,
      }]
    }))
  }, [pairs])

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(measureConnections)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureConnections)
    const observed = [boardRef.current, ...domainRefs.current.values(), ...codomainRefs.current.values()].filter(Boolean) as Element[]
    observed.forEach((element) => resizeObserver?.observe(element))
    window.addEventListener('resize', measureConnections)
    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureConnections)
    }
  }, [codomain, domain, measureConnections])

  return (
    <div className="mapping-board" ref={boardRef}>
      <svg className="mapping-lines" aria-hidden="true">
        {connections.map((connection) => {
          const reach = Math.max(36, (connection.endX - connection.startX) * .38)
          return <path key={connection.id} d={`M ${connection.startX} ${connection.startY} C ${connection.startX + reach} ${connection.startY}, ${connection.endX - reach} ${connection.endY}, ${connection.endX} ${connection.endY}`} />
        })}
      </svg>
      <div className="mapping-column mapping-column--left">
        <span>DOMÍNIO</span>
        {domain.map((item) => <div key={item} ref={(element) => { if (element) domainRefs.current.set(item, element); else domainRefs.current.delete(item) }}>{item}</div>)}
      </div>
      <div className="mapping-column mapping-column--right">
        <span>CONTRADOMÍNIO</span>
        {codomain.map((item) => <div key={item} ref={(element) => { if (element) codomainRefs.current.set(item, element); else codomainRefs.current.delete(item) }}>{item}</div>)}
      </div>
    </div>
  )
}

export function FunctionsStudio({ mode }: { mode: Mode }) {
  const preset = presets[mode]
  const [pairs, setPairs] = useState<Pair[]>(preset.pairs)
  const [history, setHistory] = useState<Pair[][]>([])
  const [from, setFrom] = useState(preset.domain[0])
  const [to, setTo] = useState(preset.codomain[0])
  const [prediction, setPrediction] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(mode === 'explore' || mode === 'sandbox')
  const [active, setActive] = useState('is-function')
  const markComplete = useLearningStore((state) => state.markComplete)
  const analysis = useMemo(() => analyzeFunction(preset.domain, preset.codomain, pairs), [pairs, preset])
  const results = [analysis.isFunction, analysis.injective, analysis.surjective, analysis.bijective]
  const activeResult = results.find((item) => item.id === active) ?? analysis.isFunction

  const commit = (next: Pair[], message: string) => { setHistory((items) => [...items, pairs]); setPairs(next); journalAction('functions', message) }
  const addPair = () => {
    if (pairs.some((pair) => pair.from === from && pair.to === to)) return
    commit([...pairs, { from, to }], `Conectou ${from} a ${to}.`)
  }
  const removePair = (target: Pair) => commit(pairs.filter((pair) => pair !== target), `Removeu ${target.from}→${target.to}.`)
  const undo = () => { const previous = history.at(-1); if (previous) { setPairs(previous); setHistory((items) => items.slice(0, -1)) } }
  const reset = () => { setPairs(preset.pairs); setHistory([]); setPrediction(null); setRevealed(mode === 'explore' || mode === 'sandbox') }
  const submit = (value: boolean) => { setPrediction(value); setRevealed(true); markComplete(`functions-${mode}`); useLearningStore.getState().addJournal({ topic: 'functions', kind: 'prediction', message: `Previu ${value ? 'função' : 'não função'}.` }) }

  const stage = <div className="lab-card function-lab">
    <div className="lab-toolbar"><div><strong>Máquina de atribuições</strong><span>Domínio → Contradomínio</span></div><span>Imagem = {'{'}{analysis.image.join(', ')}{'}'}</span></div>
    <MappingBoard domain={preset.domain} codomain={preset.codomain} pairs={pairs} />
    <div className="pair-composer"><label>Entrada<select value={from} onChange={(event) => setFrom(event.target.value)}>{preset.domain.map((item) => <option key={item}>{item}</option>)}</select></label><ArrowRight size={18} /><label>Saída<select value={to} onChange={(event) => setTo(event.target.value)}>{preset.codomain.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button button--secondary" onClick={addPair}><Plus size={16} /> Conectar</button></div>
    <div className="pair-list"><span className="pair-list__label">f =</span>{pairs.length ? pairs.map((pair, index) => <span className="pair-chip" key={`${pair.from}-${pair.to}-${index}`}>({pair.from}, {pair.to})<button aria-label={`Remover ${pair.from} para ${pair.to}`} onClick={() => removePair(pair)}><Trash2 size={13} /></button></span>) : <span className="muted">Conecte cada entrada a uma saída.</span>}</div>
  </div>
  const inspector = !revealed ? <PredictionPanel question="Este diagrama representa uma função?" onSubmit={submit} /> : <div className="investigation">
    {prediction !== null && <div className={`feedback-note ${prediction === analysis.isFunction.value ? 'is-success' : 'is-review'}`}><strong>{prediction === analysis.isFunction.value ? 'Previsão confirmada' : 'Hipótese revisada'}</strong><span>{analysis.isFunction.summary}</span></div>}
    <div className="analysis-list">{results.map((result) => <AnalysisCard key={result.id} result={result} active={active === result.id} onClick={() => setActive(result.id)} />)}</div>
    <section className="explanation-panel"><div className="eyebrow">Evidência</div><h3>{activeResult.summary}</h3>{activeResult.evidence[0] ? <><strong>{activeResult.evidence[0].title}</strong><p>{activeResult.evidence[0].explanation}</p></> : <p>Cada entrada e cada saída foram comparadas com a definição.</p>}</section>
    <div className="formalization"><span>Definição operacional</span><p>Uma relação é função quando cada elemento do domínio possui exatamente uma imagem.</p></div>
  </div>
  return <StudioScaffold eyebrow={mode === 'learn' ? 'Missão 2 · Regra de atribuição' : mode === 'sandbox' ? 'Laboratório aberto' : mode === 'challenges' ? 'Nível 3 · Diagnóstico' : 'Cenário preparado'} title={mode === 'challenges' ? 'Conserte esta atribuição' : 'Cada entrada sabe para onde ir?'} description="Crie conexões e descubra a diferença entre função, injeção, sobrejeção e bijeção." controls={<div className="inline-actions"><button className="icon-button" onClick={undo} disabled={!history.length} aria-label="Desfazer"><Undo2 size={18} /></button><button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button></div>} stage={stage} inspector={inspector} footer={<div className="footer-status"><Sparkles size={16} /> A análise separa existência, unicidade e cobertura.</div>} />
}
