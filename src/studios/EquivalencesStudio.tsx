import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import type { Mode } from '../core/types'
import { journalAction, useLearningStore } from '../core/store'
import { findTransformations } from '../engines/equivalences'
import { expressionToLatex, expressionToString, expressionsEquivalent, parseExpression, type Expr } from '../engines/logic'
import { MathExpression } from '../components/MathExpression'
import { StudioScaffold } from '../components/StudioScaffold'

const examples: Record<Mode, string> = { learn: '¬(p ∧ q)', explore: '(p ∨ q) ∧ p', sandbox: '(p → q) ∧ V', challenges: '¬¬(p → q)' }

export function EquivalencesStudio({ mode }: { mode: Mode }) {
  const initial = examples[mode]
  const initialExpr = parseExpression(initial)
  const [expression, setExpression] = useState<Expr>(initialExpr)
  const [history, setHistory] = useState<Array<{ expression: Expr; law: string }>>([])
  const [custom, setCustom] = useState(initial)
  const [message, setMessage] = useState('')
  const candidates = useMemo(() => findTransformations(expression), [expression])
  const markComplete = useLearningStore((state) => state.markComplete)

  const apply = (index: number) => {
    const candidate = candidates[index]
    if (!candidate) return
    setHistory((items) => [...items, { expression, law: candidate.law }])
    setExpression(candidate.expression)
    setCustom(expressionToString(candidate.expression))
    setMessage(`${candidate.law}: significado preservado.`)
    journalAction('equivalences', `Aplicou ${candidate.law}.`)
    markComplete(`equivalences-${mode}`)
  }
  const parseCustom = () => {
    try { const next = parseExpression(custom); setHistory((items) => [...items, { expression, law: 'Expressão anterior' }]); setExpression(next); setMessage('Expressão carregada para transformação.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Expressão inválida.') }
  }
  const undo = () => { const previous = history.at(-1); if (previous) { setExpression(previous.expression); setCustom(expressionToString(previous.expression)); setHistory((items) => items.slice(0, -1)); setMessage(`Desfeita: ${previous.law}.`) } }
  const reset = () => { setExpression(initialExpr); setCustom(initial); setHistory([]); setMessage('') }
  const base = history[0]?.expression ?? initialExpr
  const equivalent = expressionsEquivalent(base, expression)

  const stage = <div className="lab-card equivalence-lab">
    <div className="lab-toolbar"><div><strong>Bancada de reescrita</strong><span>Cada passo deve preservar todas as valorações</span></div><span className={equivalent ? 'syntax-badge' : 'syntax-badge is-error'}>{equivalent ? 'Equivalência preservada' : 'Significado alterado'}</span></div>
    <div className="equation-stage"><div className="equation-card"><span>EXPRESSÃO ATUAL</span><MathExpression block value={expressionToLatex(expression)} /></div><ArrowRight size={24} /><div className="equation-card equation-card--goal"><span>OBJETIVO</span><strong>{mode === 'challenges' ? 'Eliminar negações duplas' : 'Escolha uma lei aplicável'}</strong></div></div>
    <div className="transformations"><div className="transformations__header"><h3>Transformações disponíveis</h3><span>{candidates.length} passos válidos</span></div>{candidates.length ? candidates.slice(0, 8).map((candidate, index) => <button className="law-card" onClick={() => apply(index)} key={candidate.id}><span>{candidate.law}</span><div><MathExpression value={expressionToLatex(parseExpression(candidate.before))} /><ArrowRight size={15} /><MathExpression value={expressionToLatex(candidate.expression)} /></div><small>{candidate.explanation}</small></button>) : <div className="empty-state"><CheckCircle2 size={28} /><strong>Forma estável</strong><span>Nenhuma lei de simplificação disponível neste ponto.</span></div>}</div>
    {(mode === 'sandbox' || mode === 'explore') && <div className="custom-expression"><input value={custom} onChange={(event) => setCustom(event.target.value)} aria-label="Expressão personalizada" /><button className="button button--secondary" onClick={parseCustom}>Carregar expressão</button></div>}
  </div>
  const inspector = <div className="investigation"><div className="eyebrow">Histórico verificável</div><h3>Cadeia de equivalências</h3><div className="proof-chain"><div><span>0</span><MathExpression value={expressionToLatex(base)} /><small>ponto de partida</small></div>{history.map((step, index) => <div key={index}><span>{index + 1}</span><MathExpression value={expressionToLatex(index === history.length - 1 ? expression : history[index + 1]?.expression ?? expression)} /><small>{step.law}</small></div>)}</div>{message && <div className="feedback-note is-success"><strong>Verificação</strong><span>{message}</span></div>}<section className="explanation-panel"><h3>Por que o valor não muda?</h3><p>Uma lei de equivalência substitui uma subexpressão por outra que possui a mesma coluna final em todas as valorações.</p></section></div>
  return <StudioScaffold eyebrow={mode === 'learn' ? 'Missão 6 · Leis de equivalência' : mode === 'sandbox' ? 'Laboratório aberto' : mode === 'challenges' ? 'Nível 4 · Simplificação' : 'Cenário preparado'} title="Transforme sem mudar o significado" description="Aplique uma lei por vez e construa uma prova rastreável de equivalência." controls={<div className="inline-actions"><button className="icon-button" disabled={!history.length} onClick={undo} aria-label="Desfazer"><Undo2 size={18} /></button><button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button></div>} stage={stage} inspector={inspector} footer={<div className="footer-status"><Sparkles size={16} /> As leis só aparecem onde sua estrutura realmente se aplica.</div>} />
}
