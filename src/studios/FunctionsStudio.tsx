import { useMemo, useState } from 'react'
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

  const yAt = (index: number, count: number) => 16 + (index * 68) + (count === 1 ? 90 : 0)
  const stage = <div className="lab-card function-lab">
    <div className="lab-toolbar"><div><strong>Máquina de atribuições</strong><span>Domínio → Contradomínio</span></div><span>Imagem = {'{'}{analysis.image.join(', ')}{'}'}</span></div>
    <div className="mapping-board">
      <svg className="mapping-lines" viewBox="0 0 700 280" preserveAspectRatio="none" aria-hidden="true">{pairs.map((pair, index) => {
        const fromIndex = preset.domain.indexOf(pair.from); const toIndex = preset.codomain.indexOf(pair.to)
        return <path key={`${pair.from}-${pair.to}-${index}`} d={`M 205 ${yAt(fromIndex, preset.domain.length) + 19} C 310 ${yAt(fromIndex, preset.domain.length) + 19}, 390 ${yAt(toIndex, preset.codomain.length) + 19}, 495 ${yAt(toIndex, preset.codomain.length) + 19}`} />
      })}</svg>
      <div className="mapping-column mapping-column--left"><span>DOMÍNIO</span>{preset.domain.map((item, index) => <div key={item} style={{ top: yAt(index, preset.domain.length) }}>{item}</div>)}</div>
      <div className="mapping-column mapping-column--right"><span>CONTRADOMÍNIO</span>{preset.codomain.map((item, index) => <div key={item} style={{ top: yAt(index, preset.codomain.length) }}>{item}</div>)}</div>
    </div>
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
