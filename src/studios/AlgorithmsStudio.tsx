import { useMemo, useState } from 'react'
import { Braces, Play, RotateCcw, Sparkles } from 'lucide-react'
import type { Mode } from '../core/types'
import { useLearningStore } from '../core/store'
import { evaluateExpression, expressionToLatex, parseExpression, type EvaluationStep } from '../engines/logic'
import { MathExpression } from '../components/MathExpression'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'

const formulas: Record<Mode, string> = { learn: 'idade_ok ∧ usuario_logado', explore: '(saldo_ok ∧ cartao_valido) ∨ admin', sandbox: '(p ∧ q) ∨ admin', challenges: 'usuario_logado ∧ (admin ∨ gestor)' }

export function AlgorithmsStudio({ mode }: { mode: Mode }) {
  const initial = formulas[mode]
  const [source, setSource] = useState(initial)
  const [values, setValues] = useState<Record<string, boolean>>({ idade_ok: true, usuario_logado: true, saldo_ok: false, cartao_valido: true, admin: false, gestor: true, p: true, q: false })
  const [prediction, setPrediction] = useState<boolean | null>(null)
  const [ran, setRan] = useState(mode === 'explore' || mode === 'sandbox')
  const parsed = useMemo(() => { try { return { expression: parseExpression(source), error: '' } } catch (error) { return { expression: null, error: error instanceof Error ? error.message : 'Expressão inválida.' } } }, [source])
  const steps: EvaluationStep[] = []
  const outcome = parsed.expression ? evaluateExpression(parsed.expression, values, steps) : null
  const variables = parsed.expression ? [...new Set(source.match(/[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/g)?.filter((name) => !['V', 'F', 'e', 'ou', 'nao'].includes(name)) ?? [])] : []
  const markComplete = useLearningStore((state) => state.markComplete)
  const run = (value?: boolean) => { if (value !== undefined) setPrediction(value); setRan(true); markComplete(`logic-algorithms-${mode}`); useLearningStore.getState().addJournal({ topic: 'logic-algorithms', kind: 'discovery', message: `Executou a decisão ${source}.` }) }
  const reset = () => { setSource(initial); setPrediction(null); setRan(mode === 'explore' || mode === 'sandbox') }
  const jsCode = `if (${source.replaceAll('∧', '&&').replaceAll('∨', '||').replaceAll('¬', '!').replaceAll('→', '/* implica */')}) {\n  permitirAcesso();\n} else {\n  bloquearAcesso();\n}`

  const stage = <div className="lab-card algorithm-lab">
    <div className="lab-toolbar"><div><strong>Depurador de decisão</strong><span>Predicados → condição → ramificação</span></div><Braces size={19} /></div>
    <div className="algorithm-grid"><section className="variables-panel"><h3>Estado de entrada</h3>{variables.map((variable) => <button key={variable} className={values[variable] ? 'is-true' : 'is-false'} onClick={() => { setValues((current) => ({ ...current, [variable]: !current[variable] })); setRan(mode === 'explore' || mode === 'sandbox') }}><span>{variable.replaceAll('_', ' ')}</span><strong>{values[variable] ? 'true' : 'false'}</strong></button>)}</section><section className="code-panel"><div className="code-panel__tabs"><span className="is-active">JavaScript</span><span>Fluxo lógico</span></div><pre><code>{jsCode}</code></pre>{(mode === 'sandbox' || mode === 'explore') && <input value={source} onChange={(event) => { setSource(event.target.value); setRan(false) }} aria-label="Condição lógica" />}{parsed.error && <div className="syntax-error">{parsed.error}</div>}</section></div>
    <div className="execution-flow"><div className="flow-node"><span>CONDIÇÃO</span>{parsed.expression ? <MathExpression value={expressionToLatex(parsed.expression)} /> : '—'}</div><div className={`flow-arrow${ran ? ' is-active' : ''}`}>→</div><div className={`flow-node flow-node--outcome${ran ? outcome ? ' is-true' : ' is-false' : ''}`}><span>RAMO EXECUTADO</span><strong>{ran ? outcome ? 'permitirAcesso()' : 'bloquearAcesso()' : 'aguardando'}</strong></div></div>
  </div>
  const inspector = !ran && parsed.expression ? <PredictionPanel question="Qual ramo será executado?" yesLabel="Permitir" noLabel="Bloquear" onSubmit={run} /> : <div className="investigation"><div className={`logic-result ${outcome ? 'is-true' : 'is-false'}`}><span>Decisão</span><strong>{outcome ? 'ACESSO PERMITIDO' : 'ACESSO BLOQUEADO'}</strong></div>{prediction !== null && <div className={`feedback-note ${prediction === outcome ? 'is-success' : 'is-review'}`}><strong>{prediction === outcome ? 'Previsão confirmada' : 'Execução divergente'}</strong><span>O rastro mostra qual subcondição mudou a decisão.</span></div>}<section className="trace-panel"><div className="eyebrow"><Play size={13} /> Depuração</div>{steps.map((step, index) => <div className="trace-step" key={`${step.expression}-${index}`}><span>{index + 1}</span><div><strong>{step.expression} = {step.result ? 'true' : 'false'}</strong><p>{step.explanation}</p></div></div>)}</section></div>
  return <StudioScaffold eyebrow={mode === 'learn' ? 'Missão 7 · Decisões no código' : mode === 'sandbox' ? 'Laboratório aberto' : mode === 'challenges' ? 'Nível 5 · Controle de acesso' : 'Cenário preparado'} title="Quando a lógica vira comportamento" description="Altere entradas, antecipe o ramo e depure a expressão que controla o algoritmo." controls={<button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button>} stage={stage} inspector={inspector} footer={<div className="footer-status"><Sparkles size={16} /> Cada variável lógica representa uma pergunta que o programa sabe responder.</div>} />
}
