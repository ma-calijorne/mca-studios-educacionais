import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Check, ChevronRight, Clock3, Copy, DoorOpen, Eye, Fingerprint, KeyRound, Lightbulb, LockKeyhole, RefreshCw, Shield, Sparkles, Users } from 'lucide-react'
import { createGameTeam, getGameState, joinGameTeam, submitFinalKey, submitMission, useMissionHint } from './api'
import type { GameMission, GameState, MissionSubmission } from './types'

const emptyEvidence = { representation: '', result: '', test: '', explanation: '' }

function ExpeditionClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  return <span>{[hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')}</span>
}

function Brief({ mission }: { mission: GameMission }) {
  if (mission.answerKind === 'set') {
    const sets = mission.brief.sets as Record<string, number[]>
    return <div className="game-brief game-brief--sets"><p>U = {'{1, 2, ..., 12}'}</p>{Object.entries(sets).map(([name, values]) => <p key={name}>{name} = {'{'}{values.join(', ')}{'}'}</p>)}<strong>(A ∪ B) \ C = ?</strong></div>
  }
  if (mission.answerKind === 'relation') return <div className="game-brief"><p>S = {'{A, B, C, D}'}</p><p>R = {'{'}{(mission.brief.pairs as string[]).map((pair) => `(${pair})`).join(', ')}{'}'}</p></div>
  if (mission.answerKind === 'function') return <div className="game-brief game-brief--mapping">{(mission.brief.mapping as string[]).map((item) => <span key={item}>{item}</span>)}</div>
  if (mission.answerKind === 'logic') return <div className="game-brief game-brief--logic"><strong>p → q</strong><strong>¬q</strong><span>∴ ?</span><p>{String(mission.brief.formula)}</p><p>{String(mission.brief.equivalence)}</p></div>
  if (mission.answerKind === 'algorithm') return <div className="game-brief"><code>{String(mission.brief.rule)}</code><p>Testes: {(mission.brief.tests as string[]).join(' · ')}</p><small>Ordem: selo, operador, emergencia, guardiao</small></div>
  if (mission.answerKind === 'circuit') return <div className="game-brief game-brief--circuit"><span>A</span><strong>⊕</strong><span>B</span><strong>∧</strong><span>¬ I</span><strong>= L</strong></div>
  return <ol className="game-brief game-brief--questions">{(mission.brief.questions as string[]).map((question) => <li key={question}>{question}</li>)}</ol>
}

interface AnswerProps { answer: Record<string, unknown>; setAnswer: (next: Record<string, unknown>) => void }

function CheckboxGroup({ values, selected, onChange, columns }: { values: Array<string | number>; selected: Array<string | number>; onChange: (next: Array<string | number>) => void; columns?: boolean }) {
  return <div className={`game-checks${columns ? ' game-checks--columns' : ''}`}>{values.map((value) => {
    const checked = selected.map(String).includes(String(value))
    return <label key={value}><input checked={checked} onChange={() => onChange(checked ? selected.filter((item) => String(item) !== String(value)) : [...selected, value])} type="checkbox" /><span>{value}</span></label>
  })}</div>
}

function AnswerFields({ mission, answer, setAnswer }: AnswerProps & { mission: GameMission }) {
  const set = (key: string, value: unknown) => setAnswer({ ...answer, [key]: value })
  if (mission.answerKind === 'set') return <div className="game-answer-grid"><label className="game-field game-field--wide"><span>Elementos do resultado</span><CheckboxGroup values={[1,2,3,4,5,6,7,8,9,10,11,12]} selected={(answer.elements as number[]) ?? []} onChange={(value) => set('elements', value)} /></label><label className="game-field"><span>Cardinalidade</span><input min="0" onChange={(event) => set('cardinality', event.target.value)} type="number" value={String(answer.cardinality ?? '')} /></label></div>
  if (mission.answerKind === 'relation') return <div className="game-answer-grid"><label className="game-field game-field--wide"><span>Propriedades válidas</span><CheckboxGroup values={['Reflexiva', 'Simétrica', 'Antissimétrica', 'Transitiva']} selected={(answer.properties as string[]) ?? []} onChange={(value) => set('properties', value)} columns /></label><label className="game-field"><span>Par que falta</span><input onChange={(event) => set('missingPair', event.target.value)} placeholder="(A,C)" value={String(answer.missingPair ?? '')} /></label></div>
  if (mission.answerKind === 'function') return <div className="game-answer-grid"><label className="game-field"><span>Classificação atual</span><select onChange={(event) => set('classification', event.target.value)} value={String(answer.classification ?? '')}><option value="">Selecione</option><option>Função não-injetiva e não-sobrejetiva</option><option>Função injetiva</option><option>Função sobrejetiva</option><option>Função bijetiva</option></select></label><label className="game-field"><span>Reparo de uma imagem</span><select onChange={(event) => set('repair', event.target.value)} value={String(answer.repair ?? '')}><option value="">Selecione</option><option>Orfeu→Oeste</option><option>Iris→Oeste</option><option>Nox→Norte</option><option>Salma→Sul</option></select></label></div>
  if (mission.answerKind === 'logic') return <div className="game-answer-grid"><label className="game-field"><span>Conclusão</span><select onChange={(event) => set('conclusion', event.target.value)} value={String(answer.conclusion ?? '')}><option value="">Selecione</option><option>p</option><option>¬p</option><option>q</option><option>¬q</option></select></label><label className="game-field"><span>Classe da fórmula</span><select onChange={(event) => set('formulaClass', event.target.value)} value={String(answer.formulaClass ?? '')}><option value="">Selecione</option><option>Tautologia</option><option>Contradição</option><option>Contingência</option></select></label><label className="game-field game-field--wide"><span>Equivalência de p → q</span><input onChange={(event) => set('equivalence', event.target.value)} placeholder="Use ¬, ∨, p e q" value={String(answer.equivalence ?? '')} /></label></div>
  if (mission.answerKind === 'algorithm') return <div className="game-answer-grid"><label className="game-field game-field--wide"><span>Predicado</span><select onChange={(event) => set('predicate', event.target.value)} value={String(answer.predicate ?? '')}><option value="">Selecione</option><option>(selo&&operador)||(emergencia&&guardiao)</option><option>selo&&(operador||emergencia)&&guardiao</option><option>(selo||operador)&&(emergencia||guardiao)</option></select></label><label className="game-field"><span>Saídas dos quatro testes</span><input inputMode="numeric" maxLength={4} onChange={(event) => set('outputs', event.target.value)} placeholder="0000" value={String(answer.outputs ?? '')} /></label></div>
  if (mission.answerKind === 'circuit') return <div className="game-answer-grid"><label className="game-field game-field--wide"><span>Expressão booleana</span><input onChange={(event) => set('expression', event.target.value)} placeholder="L = ..." value={String(answer.expression ?? '')} /></label><label className="game-field game-field--wide"><span>Linhas ABI que acendem L</span><CheckboxGroup values={mission.brief.rows as string[]} selected={(answer.activeRows as string[]) ?? []} onChange={(value) => set('activeRows', value)} /></label></div>
  const fields = [['additive', 'Alternativas'], ['multiplicative', 'Etapas'], ['combination', 'Escolha'], ['constrained', 'Código'], ['total', 'Soma final']]
  return <div className="game-answer-grid game-answer-grid--five">{fields.map(([key, label]) => <label className="game-field" key={key}><span>{label}</span><input min="0" onChange={(event) => set(key, event.target.value)} type="number" value={String(answer[key] ?? '')} /></label>)}</div>
}

function LockedGame() {
  return <main className="game-page game-page--locked"><section className="game-locked"><div className="game-locked__sigil"><LockKeyhole size={38} /></div><span>ACESSO SELADO</span><h1>O Último Axioma aguarda o professor</h1><p>O jogo já está visível no laboratório, mas a expedição só começa quando o professor liberar o acesso no módulo administrativo.</p><div><Clock3 size={16} /> Permaneça nesta página e atualize quando receber o sinal.</div></section></main>
}

function TeamLobby({ onReady }: { onReady: (state: GameState) => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { onReady(mode === 'create' ? await createGameTeam(value) : await joinGameTeam(value)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível preparar a equipe.') }
    finally { setBusy(false) }
  }
  return <main className="game-page game-lobby"><section className="game-lobby__story"><span>EVENTO INTEGRADOR</span><h1>O Último Axioma</h1><h2>Os Sete Selos do Paradoxo</h2><p>Às 23h17, o sistema registrou uma oitava operação em uma disciplina de sete axiomas. Sua equipe tem 180 minutos para atravessar as câmaras, reunir as runas e conter o paradoxo.</p><div className="game-role-strip"><span><Eye size={16} /> Cartógrafo</span><span><Fingerprint size={16} /> Decifrador</span><span><Shield size={16} /> Cético</span><span><KeyRound size={16} /> Guardião</span></div></section><section className="game-lobby__entry"><div className="game-lobby__tabs"><button className={mode === 'create' ? 'is-active' : ''} onClick={() => setMode('create')}>Criar equipe</button><button className={mode === 'join' ? 'is-active' : ''} onClick={() => setMode('join')}>Entrar com código</button></div><form onSubmit={submit}><label className="game-field"><span>{mode === 'create' ? 'Nome da equipe' : 'Código da equipe'}</span><input autoFocus maxLength={mode === 'create' ? 48 : 6} onChange={(event) => setValue(mode === 'join' ? event.target.value.toUpperCase() : event.target.value)} placeholder={mode === 'create' ? 'Ex.: Ordem de Cantor' : 'ABC123'} required value={value} /></label>{error && <div className="game-error" role="alert"><AlertTriangle size={16} /> {error}</div>}<button className="game-primary" disabled={busy || value.trim().length < 2} type="submit">{busy ? 'Abrindo passagem…' : mode === 'create' ? 'Criar e iniciar' : 'Entrar na expedição'}<ChevronRight size={17} /></button></form><p>Uma pessoa cria a equipe e compartilha o código. Os demais integrantes entram com o mesmo código.</p></section></main>
}

export function GamePage() {
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prediction, setPrediction] = useState('')
  const [evidence, setEvidence] = useState(emptyEvidence)
  const [answer, setAnswer] = useState<Record<string, unknown>>({})
  const [feedback, setFeedback] = useState('')
  const [hint, setHint] = useState('')
  const [finalKey, setFinalKey] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setLoading(true)
    try { setState(await getGameState()); setError('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o jogo.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void getGameState().then(setState).catch(() => undefined)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [])
  const current = useMemo(() => state?.missions.find((mission) => mission.status === 'available') ?? null, [state])
  useEffect(() => { setPrediction(''); setEvidence(emptyEvidence); setAnswer({}); setFeedback(''); setHint('') }, [current?.id])

  async function validate(event: FormEvent) {
    event.preventDefault(); if (!current) return
    setBusy(true); setError(''); setFeedback('')
    try {
      const result = await submitMission(current.id, { prediction, evidence, answer } as MissionSubmission)
      setState(result.state); setFeedback(result.validation.feedback)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível validar o selo.') }
    finally { setBusy(false) }
  }

  async function revealHint() {
    if (!current || !window.confirm('Consumir 1 fragmento para abrir a pista?')) return
    setBusy(true); setError('')
    try { const result = await useMissionHint(current.id); setHint(result.hint); setState(result.state) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a pista.') }
    finally { setBusy(false) }
  }

  async function finish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await submitFinalKey(finalKey); setState(result.state); setFeedback(result.feedback ?? '') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível validar a chave.') }
    finally { setBusy(false) }
  }

  if (loading) return <main className="game-page game-loading"><RefreshCw className="is-spinning" size={28} /><span>Restaurando o arquivo do paradoxo…</span></main>
  if (!state && error) return <main className="game-page game-loading"><AlertTriangle size={28} /><span>{error}</span><button className="game-secondary" onClick={() => void refresh()}>Tentar novamente</button></main>
  if (!state?.access.enabled) return <LockedGame />
  if (!state.team) return <TeamLobby onReady={setState} />

  const team = state.team
  const completed = team.currentStage
  return <main className="game-page game-experience">
    <header className="game-header"><div><span>O ÚLTIMO AXIOMA</span><strong>{state.access.session?.title}</strong></div><div className="game-header__metrics"><span><Clock3 size={15} /> <ExpeditionClock startedAt={state.access.session?.startedAt ?? new Date().toISOString()} /></span><span><Sparkles size={15} /> {team.score} pts</span><span><Lightbulb size={15} /> {team.fragments} fragmentos</span></div></header>
    <aside className="game-seals"><div className="game-team"><span>EQUIPE</span><strong>{team.name}</strong><button title="Copiar código" onClick={() => void navigator.clipboard.writeText(team.code)}>{team.code}<Copy size={13} /></button><small>{team.members.length} integrante{team.members.length === 1 ? '' : 's'}</small></div><ol>{state.missions.map((mission) => <li className={`is-${mission.status}`} key={mission.id}><span>{mission.status === 'completed' ? mission.seal : mission.order}</span><div><strong>{mission.title}</strong><small>{mission.studio}</small></div>{mission.status === 'completed' ? <Check size={16} /> : <LockKeyhole size={14} />}</li>)}</ol></aside>
    <section className="game-stage">
      {team.completedAt ? <section className="game-victory"><div><DoorOpen size={52} /></div><span>PARADOXO CONTIDO</span><h1>A última porta voltou a obedecer à lógica</h1><p>A equipe reuniu os sete selos, demonstrou cada resultado e encerrou a expedição com <strong>{team.score} pontos</strong>.</p><code>PARADOX · 128 · 1</code></section> : current ? <form className="game-mission" onSubmit={validate}>
        <div className="game-mission__heading"><div><span>SELO {current.order} DE 7 · {current.duration} MIN</span><h1>{current.title}</h1><p>{current.atmosphere}</p></div><div className="game-mission__progress"><strong>{completed}/7</strong><span>selos rompidos</span></div></div>
        <section className="game-objective"><span>INSCRIÇÃO NA PORTA</span><p>{current.objective}</p></section>
        <Brief mission={current} />
        <section className="game-response"><h2>Resposta da equipe</h2><AnswerFields answer={answer} mission={current} setAnswer={setAnswer} /><label className="game-field"><span>Previsão antes da validação</span><textarea onChange={(event) => setPrediction(event.target.value)} placeholder="O que a equipe espera encontrar e por quê?" rows={2} value={prediction} /></label></section>
        <section className="game-evidence"><h2>Quatro evidências obrigatórias</h2><div>{([['representation','Representação usada'],['result','Resultado obtido'],['test','Teste ou caso verificado'],['explanation','Explicação matemática']] as const).map(([key, label]) => <label className="game-field" key={key}><span>{label}</span><textarea onChange={(event) => setEvidence({ ...evidence, [key]: event.target.value })} rows={2} value={evidence[key]} /></label>)}</div></section>
        {hint && <div className="game-hint"><Lightbulb size={18} /><span><strong>Pista consumida</strong>{hint}</span></div>}
        {feedback && <div className={`game-feedback${feedback.includes('pode avançar') ? ' is-success' : ''}`}><Fingerprint size={18} />{feedback}</div>}
        {error && <div className="game-error" role="alert"><AlertTriangle size={16} /> {error}</div>}
        <div className="game-mission__actions"><button className="game-secondary" disabled={busy || current.hintUsed || team.fragments < 1} onClick={() => void revealHint()} type="button"><Lightbulb size={16} /> {current.hintUsed ? 'Pista já usada' : 'Usar 1 fragmento'}</button><button className="game-primary" disabled={busy} type="submit">{busy ? 'Verificando evidências…' : 'Submeter ao selo'}<KeyRound size={16} /></button></div>
      </form> : <form className="game-final" onSubmit={finish}><span>CÂMARA FINAL</span><h1>As runas formam uma palavra</h1><p>Combine a palavra revelada, o número de configurações possíveis dos sete selos e quantas configurações satisfazem a conjunção de todos eles.</p><div className="game-final__runes">{state.missions.map((mission) => <i key={mission.id}>{mission.seal}</i>)}</div><label className="game-field"><span>Chave final</span><input onChange={(event) => setFinalKey(event.target.value.toUpperCase())} placeholder="PALAVRA-000-0" value={finalKey} /></label>{feedback && <div className={`game-feedback${feedback.includes('contido') ? ' is-success' : ''}`}>{feedback}</div>}{error && <div className="game-error" role="alert">{error}</div>}<button className="game-primary" disabled={busy} type="submit">Abrir a última porta<KeyRound size={17} /></button></form>}
    </section>
    <aside className="game-scoreboard"><div><span>PLACAR AO VIVO</span><strong>{state.leaderboard.length} equipes</strong></div><ol>{state.leaderboard.map((entry, index) => <li className={entry.name === team.name ? 'is-current' : ''} key={`${entry.name}-${index}`}><b>{index + 1}</b><span><strong>{entry.name}</strong><small>Selo {entry.stage}/7</small></span><em>{entry.score}</em></li>)}</ol><footer><Users size={15} /><span>{team.members.map((member) => member.name).join(' · ')}</span></footer></aside>
  </main>
}
