import { useMemo, useState } from 'react'
import { Play, RotateCcw, Sparkles } from 'lucide-react'
import type { Mode } from '../core/types'
import { useLearningStore } from '../core/store'
import { evaluateExpression, expressionToLatex, expressionVariables, parseExpression, type EvaluationStep } from '../engines/logic'
import { MathExpression } from '../components/MathExpression'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'

const examples: Record<Mode, string> = {
  learn: 'chove → levo_guarda_chuva',
  explore: '(estudo ∧ pratico) → aprendo',
  sandbox: '(p ∨ q) ∧ ¬r',
  challenges: '(p → q) ∧ p',
}

export function LogicStudio({ mode }: { mode: Mode }) {
  const initial = examples[mode]
  const [source, setSource] = useState(initial)
  const [values, setValues] = useState<Record<string, boolean>>({ chove: true, levo_guarda_chuva: false, estudo: true, pratico: true, aprendo: true, p: true, q: false, r: false })
  const [prediction, setPrediction] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(mode === 'explore' || mode === 'sandbox')
  const parsed = useMemo(() => { try { return { expression: parseExpression(source), error: '' } } catch (error) { return { expression: null, error: error instanceof Error ? error.message : 'Expressão inválida.' } } }, [source])
  const variables = parsed.expression ? expressionVariables(parsed.expression) : []
  const steps: EvaluationStep[] = []
  const result = parsed.expression ? evaluateExpression(parsed.expression, values, steps) : null
  const markComplete = useLearningStore((state) => state.markComplete)

  const insert = (symbol: string) => setSource((current) => `${current} ${symbol} `)
  const submit = (value: boolean) => {
    setPrediction(value); setRevealed(true); markComplete(`logic-${mode}`)
    useLearningStore.getState().addJournal({ topic: 'logic', kind: 'prediction', message: `Previu valor ${value ? 'V' : 'F'} para ${source}.` })
  }
  const reset = () => { setSource(initial); setPrediction(null); setRevealed(mode === 'explore' || mode === 'sandbox') }

  const stage = <div className="lab-card logic-lab">
    <div className="lab-toolbar"><div><strong>Construtor de proposições</strong><span>Use palavras ou símbolos lógicos</span></div><span className={parsed.error ? 'syntax-badge is-error' : 'syntax-badge'}>{parsed.error ? 'Revisar sintaxe' : 'Sintaxe válida'}</span></div>
    <div className="expression-builder">
      <label>Expressão lógica<textarea value={source} onChange={(event) => setSource(event.target.value)} aria-invalid={Boolean(parsed.error)} /></label>
      <div className="operator-palette" aria-label="Operadores lógicos">{['¬', '∧', '∨', '→', '↔', '(', ')'].map((operator) => <button key={operator} onClick={() => insert(operator)}>{operator}</button>)}</div>
      {parsed.error ? <div className="syntax-error">{parsed.error}</div> : parsed.expression && <div className="expression-preview"><span>Leitura matemática</span><MathExpression block value={expressionToLatex(parsed.expression)} /></div>}
    </div>
    <div className="valuation-panel"><h3>Estado do mundo</h3><div className="truth-switches">{variables.map((variable) => <button key={variable} className={values[variable] ? 'is-true' : 'is-false'} onClick={() => setValues((current) => ({ ...current, [variable]: !current[variable] }))}><span>{variable}</span><strong>{values[variable] ? 'V' : 'F'}</strong></button>)}</div></div>
  </div>
  const inspector = !revealed && parsed.expression ? <PredictionPanel question="Qual será o valor lógico da expressão?" onSubmit={submit} /> : <div className="investigation">
    <div className={`logic-result ${result ? 'is-true' : 'is-false'}`}><span>Valor da expressão</span><strong>{result === null ? '—' : result ? 'VERDADEIRO' : 'FALSO'}</strong></div>
    {prediction !== null && <div className={`feedback-note ${prediction === result ? 'is-success' : 'is-review'}`}><strong>{prediction === result ? 'Previsão confirmada' : 'A execução revelou outro caminho'}</strong><span>Compare sua hipótese com cada etapa abaixo.</span></div>}
    <section className="trace-panel"><div className="eyebrow"><Play size={13} /> Rastro de avaliação</div>{steps.length ? steps.map((step, index) => <div className="trace-step" key={`${step.expression}-${index}`}><span>{index + 1}</span><div><strong>{step.expression} = {step.result ? 'V' : 'F'}</strong><p>{step.explanation}</p></div></div>) : <p className="muted">Corrija a expressão para acompanhar a avaliação.</p>}</section>
    <div className="formalization"><span>Caso crítico</span><p>Em uma implicação, apenas V → F é falso: a condição ocorreu, mas a consequência prometida não.</p></div>
  </div>
  return <StudioScaffold eyebrow={mode === 'learn' ? 'Missão 3 · Conectivos' : mode === 'sandbox' ? 'Laboratório aberto' : mode === 'challenges' ? 'Nível 2 · Execução' : 'Cenário preparado'} title="Da frase ao valor lógico" description="Monte uma expressão, defina o estado de cada proposição e acompanhe a avaliação passo a passo." controls={<button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button>} stage={stage} inspector={inspector} footer={<div className="footer-status"><Sparkles size={16} /> Troque um único valor e observe onde o rastro diverge.</div>} />
}
