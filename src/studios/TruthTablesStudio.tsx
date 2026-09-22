import { useMemo, useState } from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'
import type { Mode } from '../core/types'
import { useLearningStore } from '../core/store'
import { buildTruthTable, classifyTruthTable, expressionToLatex, expressionVariables, parseExpression } from '../engines/logic'
import { MathExpression } from '../components/MathExpression'
import { PredictionPanel } from '../components/PredictionPanel'
import { StudioScaffold } from '../components/StudioScaffold'

const examples: Record<Mode, string> = { learn: 'p → q', explore: '(p ∧ q) → p', sandbox: '(p ∨ q) ∧ ¬r', challenges: '(p → q) ↔ (¬q → ¬p)' }

export function TruthTablesStudio({ mode }: { mode: Mode }) {
  const initial = examples[mode]
  const [source, setSource] = useState(initial)
  const [prediction, setPrediction] = useState<'tautologia' | 'contradição' | 'contingência' | null>(null)
  const [revealed, setRevealed] = useState(mode === 'explore' || mode === 'sandbox')
  const [rowGuesses, setRowGuesses] = useState<Record<number, boolean>>({})
  const parsed = useMemo(() => { try { return { expression: parseExpression(source), error: '' } } catch (error) { return { expression: null, error: error instanceof Error ? error.message : 'Expressão inválida.' } } }, [source])
  const variables = parsed.expression ? expressionVariables(parsed.expression) : []
  const rows = parsed.expression ? buildTruthTable(parsed.expression) : []
  const classification = rows.length ? classifyTruthTable(rows) : null
  const markComplete = useLearningStore((state) => state.markComplete)
  const reveal = () => { setRevealed(true); markComplete(`truth-tables-${mode}`); if (classification) useLearningStore.getState().addJournal({ topic: 'truth-tables', kind: 'discovery', message: `Classificou ${source} como ${classification}.` }) }
  const reset = () => { setSource(initial); setPrediction(null); setRevealed(mode === 'explore' || mode === 'sandbox'); setRowGuesses({}) }

  const stage = <div className="lab-card table-lab">
    <div className="lab-toolbar"><div><strong>Gerador de casos possíveis</strong><span>{variables.length} variáveis · {rows.length} linhas</span></div>{parsed.expression && <MathExpression value={expressionToLatex(parsed.expression)} />}</div>
    <div className="table-expression"><label>Expressão<input type="text" value={source} onChange={(event) => { setSource(event.target.value); setRevealed(mode === 'explore' || mode === 'sandbox'); setPrediction(null) }} /></label>{parsed.error && <span className="syntax-error">{parsed.error}</span>}</div>
    <div className="truth-table-scroll"><table className="truth-table"><thead><tr><th>#</th>{variables.map((variable) => <th key={variable}>{variable}</th>)}<th>Hipótese</th><th>Resultado</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{<td>{index + 1}</td>}{variables.map((variable) => <td key={variable}><span className={row.values[variable] ? 'truth-cell is-true' : 'truth-cell is-false'}>{row.values[variable] ? 'V' : 'F'}</span></td>)}<td><button className={`row-guess ${rowGuesses[index] === undefined ? '' : rowGuesses[index] ? 'is-true' : 'is-false'}`} onClick={() => setRowGuesses((current) => ({ ...current, [index]: current[index] === undefined ? true : !current[index] }))}>{rowGuesses[index] === undefined ? '?' : rowGuesses[index] ? 'V' : 'F'}</button></td><td>{revealed ? <span className={row.result ? 'truth-cell is-true' : 'truth-cell is-false'}>{row.result ? 'V' : 'F'}</span> : <span className="truth-cell is-hidden">•</span>}</td></tr>)}</tbody></table></div>
  </div>
  const inspector = !revealed ? <div className="investigation"><div className="eyebrow">Antes de revelar</div><h3>Como a expressão se comporta?</h3><p className="muted">Preveja a classificação global e, se quiser, marque hipóteses linha a linha.</p><div className="classification-options">{(['tautologia', 'contradição', 'contingência'] as const).map((item) => <button className={prediction === item ? 'is-active' : ''} onClick={() => setPrediction(item)} key={item}>{item}</button>)}</div><button className="button button--primary button--wide" disabled={!prediction || !rows.length} onClick={reveal}>Revelar todos os casos</button></div> : <div className="investigation">
    <div className="eyebrow">Padrão completo</div><div className="classification-result"><span>A expressão é</span><strong>{classification ?? '—'}</strong></div>{prediction && <div className={`feedback-note ${prediction === classification ? 'is-success' : 'is-review'}`}><strong>{prediction === classification ? 'Previsão confirmada' : 'Classificação revisada'}</strong><span>{classification === 'tautologia' ? 'Todas as linhas são verdadeiras.' : classification === 'contradição' ? 'Todas as linhas são falsas.' : 'Há ao menos uma linha verdadeira e uma falsa.'}</span></div>}
    <section className="explanation-panel"><h3>{rows.filter((row) => row.result).length} de {rows.length} casos verdadeiros</h3><p>A classificação considera o conjunto inteiro de valorações, não apenas um exemplo favorável.</p></section>
  </div>
  return <StudioScaffold eyebrow={mode === 'learn' ? 'Missão 4 · Todos os casos' : mode === 'sandbox' ? 'Laboratório aberto' : mode === 'challenges' ? 'Nível 4 · Classificação' : 'Cenário preparado'} title="E se testarmos todos os mundos?" description="Gere todas as valorações possíveis, arrisque cada linha e identifique o padrão global." controls={<button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button>} stage={stage} inspector={inspector} footer={<div className="footer-status"><Sparkles size={16} /> Cada nova variável dobra o número de linhas.</div>} />
}
