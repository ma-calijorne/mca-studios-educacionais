import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GitBranch,
  Hash,
  Lightbulb,
  ListTree,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { StudioScaffold } from '../components/StudioScaffold'
import { journalAction, useLearningStore } from '../core/store'
import type { Mode } from '../core/types'
import {
  analyzePassword,
  analyzeSelection,
  analyzeStages,
  cartesianProduct,
  estimateAttackTime,
  formatCount,
  type CountingAnalysis,
  type CountingPrinciple,
  type PasswordSpecification,
} from '../engines/counting'

type CountingView = 'stages' | 'tree' | 'results' | 'formula'
type SandboxTechnique = CountingPrinciple

interface ChoiceStage {
  id: string
  label: string
  options: string[]
}

interface SandboxStage {
  id: string
  label: string
  count: number
}

interface SandboxState {
  technique: SandboxTechnique
  stages: SandboxStage[]
  n: number
  k: number
  groups: string
}

interface Challenge {
  title: string
  prompt: string
  principle: CountingPrinciple
  analysis: CountingAnalysis
  stages: ChoiceStage[]
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const digits = '0123456789'.split('')
const sandboxStorageKey = 'mci-counting-sandbox-v1'

const principleLabels: Record<CountingPrinciple, string> = {
  product: 'Princípio multiplicativo',
  sum: 'Princípio aditivo',
  permutation: 'Permutação',
  'multiset-permutation': 'Permutação com repetição',
  arrangement: 'Arranjo',
  combination: 'Combinação',
}

const viewLabels: Record<CountingView, string> = {
  stages: 'Etapas',
  tree: 'Árvore',
  results: 'Resultados',
  formula: 'Fórmula',
}

const learnStages: ChoiceStage[] = [
  { id: 'shirts', label: 'Camiseta', options: ['Azul', 'Branca', 'Preta'] },
  { id: 'pants', label: 'Calça', options: ['Jeans', 'Sarja'] },
]

const defaultPassword: PasswordSpecification = {
  letterPositions: 3,
  digitPositions: 2,
  allowRepetition: true,
  noLeadingZero: false,
}

const defaultSandbox: SandboxState = {
  technique: 'product',
  stages: [
    { id: 'sandbox-1', label: 'Entrada', count: 3 },
    { id: 'sandbox-2', label: 'Prato', count: 4 },
  ],
  n: 5,
  k: 2,
  groups: '2, 1',
}

function makeCountStage(id: string, label: string, count: number, values?: string[]): ChoiceStage {
  return {
    id,
    label,
    options: values ?? Array.from({ length: Math.max(0, count) }, (_, index) => `${label} ${index + 1}`),
  }
}

const challenges: Challenge[] = [
  {
    title: 'Senha sem zero à esquerda',
    prompt: 'Quantas sequências de quatro dígitos não começam com zero?',
    principle: 'product',
    analysis: analyzeStages('product', [9, 10, 10, 10]),
    stages: [
      makeCountStage('first', '1º dígito', 9, digits.slice(1)),
      makeCountStage('second', '2º dígito', 10, digits),
      makeCountStage('third', '3º dígito', 10, digits),
      makeCountStage('fourth', '4º dígito', 10, digits),
    ],
  },
  {
    title: 'As letras de ANA',
    prompt: 'Quantas palavras distintas podem ser formadas reorganizando A, N e A?',
    principle: 'multiset-permutation',
    analysis: analyzeSelection('multiset-permutation', 3, 3, [2, 1]),
    stages: [makeCountStage('letters', 'Letras disponíveis', 3, ['A', 'N', 'A'])],
  },
  {
    title: 'Equipe de duas pessoas',
    prompt: 'Quantas equipes diferentes de duas pessoas podem ser escolhidas entre cinco?',
    principle: 'combination',
    analysis: analyzeSelection('combination', 5, 2),
    stages: [makeCountStage('people', 'Pessoas', 5, ['Ana', 'Bia', 'Caio', 'Davi', 'Eva'])],
  },
  {
    title: 'Presidência e vice',
    prompt: 'Entre cinco pessoas, quantas escolhas diferentes existem para presidente e vice?',
    principle: 'arrangement',
    analysis: analyzeSelection('arrangement', 5, 2),
    stages: [makeCountStage('roles', 'Candidatos', 5, ['Ana', 'Bia', 'Caio', 'Davi', 'Eva'])],
  },
  {
    title: 'Loops aninhados',
    prompt: 'Um loop de 5 passos contém outro de 7 passos. Quantas execuções internas ocorrem?',
    principle: 'product',
    analysis: analyzeStages('product', [5, 7]),
    stages: [makeCountStage('outer', 'Loop externo', 5), makeCountStage('inner', 'Loop interno', 7)],
  },
]

function loadSandbox(): SandboxState {
  try {
    const saved = localStorage.getItem(sandboxStorageKey)
    if (!saved) return structuredClone(defaultSandbox)
    const parsed = JSON.parse(saved) as SandboxState
    if (!Array.isArray(parsed.stages) || !parsed.technique) return structuredClone(defaultSandbox)
    return parsed
  } catch {
    return structuredClone(defaultSandbox)
  }
}

function parseGroups(source: string): number[] {
  return source.split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0)
}

function sandboxAnalysis(state: SandboxState): CountingAnalysis {
  if (state.technique === 'product' || state.technique === 'sum') {
    return analyzeStages(state.technique, state.stages.map((stage) => stage.count))
  }
  return analyzeSelection(state.technique, state.n, state.k, parseGroups(state.groups))
}

function selectionSamples(principle: CountingPrinciple, n: number, k: number, groups: number[], limit = 60): string[][] {
  const rows: string[][] = []
  const items = Array.from({ length: Math.min(n, 10) }, (_, index) => String.fromCharCode(65 + index))

  if (principle === 'multiset-permutation') {
    const repeated = groups.flatMap((count, index) => Array.from({ length: count }, () => String.fromCharCode(65 + index)))
    const visit = (prefix: string[], remaining: string[]) => {
      if (rows.length >= limit) return
      if (!remaining.length) { rows.push(prefix); return }
      for (const value of [...new Set(remaining)]) {
        const index = remaining.indexOf(value)
        visit([...prefix, value], remaining.filter((_, itemIndex) => itemIndex !== index))
      }
    }
    visit([], repeated)
    return rows
  }

  const target = principle === 'permutation' ? items.length : Math.min(k, items.length)
  const visit = (prefix: string[], start: number) => {
    if (rows.length >= limit) return
    if (prefix.length === target) { rows.push(prefix); return }
    for (let index = principle === 'combination' ? start : 0; index < items.length; index += 1) {
      if (prefix.includes(items[index])) continue
      visit([...prefix, items[index]], principle === 'combination' ? index + 1 : 0)
    }
  }
  visit([], 0)
  return rows
}

function buildTrie(rows: string[][]) {
  interface TrieNode { value: string; children: TrieNode[] }
  const root: TrieNode = { value: 'Início', children: [] }
  for (const row of rows) {
    let node = root
    for (const value of row) {
      let child = node.children.find((item) => item.value === value)
      if (!child) {
        child = { value, children: [] }
        node.children.push(child)
      }
      node = child
    }
  }
  return root
}

function TreeBranch({ node, root = false }: { node: ReturnType<typeof buildTrie>; root?: boolean }) {
  return <li><span className={root ? 'is-root' : ''}>{node.value}</span>{node.children.length > 0 && <ul>{node.children.map((child, index) => <TreeBranch key={`${child.value}-${index}`} node={child} />)}</ul>}</li>
}

function answerMatches(source: string, expected: bigint) {
  try { return BigInt(source.trim()) === expected } catch { return false }
}

export function CountingStudio({ mode }: { mode: Mode }) {
  const [view, setView] = useState<CountingView>('stages')
  const [revealed, setRevealed] = useState(mode === 'explore' || mode === 'sandbox')
  const [prediction, setPrediction] = useState('')
  const [password, setPassword] = useState(defaultPassword)
  const [sandbox, setSandbox] = useState(loadSandbox)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [challengePrinciple, setChallengePrinciple] = useState<CountingPrinciple | ''>('')
  const [challengeAnswer, setChallengeAnswer] = useState('')
  const [challengeSubmitted, setChallengeSubmitted] = useState(false)
  const markComplete = useLearningStore((state) => state.markComplete)

  const challenge = challenges[challengeIndex]
  const groups = parseGroups(sandbox.groups)
  const technique = mode === 'sandbox' ? sandbox.technique : mode === 'challenges' ? challenge.principle : 'product'

  const stages = useMemo<ChoiceStage[]>(() => {
    if (mode === 'learn') return learnStages
    if (mode === 'challenges') return challenge.stages
    if (mode === 'sandbox') {
      if (sandbox.technique === 'product' || sandbox.technique === 'sum') {
        return sandbox.stages.map((stage) => makeCountStage(stage.id, stage.label, stage.count))
      }
      if (sandbox.technique === 'multiset-permutation') {
        return [makeCountStage('repeated', 'Grupos repetidos', groups.reduce((sum, value) => sum + value, 0), groups.flatMap((count, index) => Array.from({ length: count }, () => String.fromCharCode(65 + index))))]
      }
      return [makeCountStage('selection', 'Elementos disponíveis', sandbox.n, alphabet.slice(0, Math.min(26, sandbox.n)))]
    }

    const result: ChoiceStage[] = []
    for (let index = 0; index < password.letterPositions; index += 1) result.push(makeCountStage(`letter-${index}`, `Letra ${index + 1}`, 26, alphabet))
    for (let index = 0; index < password.digitPositions; index += 1) {
      const firstPosition = password.letterPositions === 0 && index === 0 && password.noLeadingZero
      result.push(makeCountStage(`digit-${index}`, `Dígito ${index + 1}`, firstPosition ? 9 : 10, firstPosition ? digits.slice(1) : digits))
    }
    return result
  }, [challenge.stages, groups, mode, password, sandbox])

  const analysis = useMemo(() => {
    if (mode === 'learn') return analyzeStages('product', learnStages.map((stage) => stage.options.length))
    if (mode === 'explore') return analyzePassword(password)
    if (mode === 'challenges') return challenge.analysis
    return sandboxAnalysis(sandbox)
  }, [challenge.analysis, mode, password, sandbox])

  useEffect(() => {
    if (mode === 'sandbox') localStorage.setItem(sandboxStorageKey, JSON.stringify(sandbox))
  }, [mode, sandbox])

  const resultRows = useMemo(() => {
    if (technique === 'sum') return stages.flatMap((stage) => stage.options.map((option) => [`${stage.label}: ${option}`])).slice(0, 80)
    if (technique !== 'product') return selectionSamples(technique, sandbox.n, sandbox.k, groups)
    const result = cartesianProduct(stages.map((stage) => stage.options), 80)
    if (mode !== 'explore' || password.allowRepetition) return result.rows
    const letterCount = password.letterPositions
    return result.rows.filter((row) => {
      const letters = row.slice(0, letterCount)
      const numberValues = row.slice(letterCount)
      return new Set(letters).size === letters.length && new Set(numberValues).size === numberValues.length
    }).slice(0, 60)
  }, [groups, mode, password, sandbox.k, sandbox.n, stages, technique])

  const treeRows = resultRows.slice(0, 18)
  const tree = useMemo(() => buildTrie(treeRows), [treeRows])
  const concealed = !revealed && (mode === 'learn' || mode === 'challenges')
  const challengeCorrect = challengeSubmitted && challengePrinciple === challenge.principle && answerMatches(challengeAnswer, analysis.total)

  function revealLearn() {
    setRevealed(true)
    markComplete('counting-learn')
    useLearningStore.getState().addJournal({ topic: 'counting', kind: 'prediction', message: `Previu ${prediction || 'sem valor'} possibilidades para o exemplo de vestuário.` })
  }

  function submitChallenge() {
    setChallengeSubmitted(true)
    setRevealed(true)
    if (challengePrinciple === challenge.principle && answerMatches(challengeAnswer, analysis.total)) {
      markComplete(`counting-challenge-${challengeIndex + 1}`)
      useLearningStore.getState().addJournal({ topic: 'counting', kind: 'discovery', message: `Resolveu o desafio “${challenge.title}”.` })
    }
  }

  function nextChallenge() {
    setChallengeIndex((current) => Math.min(current + 1, challenges.length - 1))
    setChallengePrinciple('')
    setChallengeAnswer('')
    setChallengeSubmitted(false)
    setRevealed(false)
    setView('stages')
  }

  function reset() {
    setView('stages')
    setPrediction('')
    if (mode === 'learn') setRevealed(false)
    if (mode === 'explore') setPassword(defaultPassword)
    if (mode === 'sandbox') {
      setSandbox(structuredClone(defaultSandbox))
      localStorage.removeItem(sandboxStorageKey)
    }
    if (mode === 'challenges') {
      setChallengePrinciple('')
      setChallengeAnswer('')
      setChallengeSubmitted(false)
      setRevealed(false)
    }
    journalAction('counting', 'Reiniciou o Estúdio de Contagem.')
  }

  function updateSandboxStage(id: string, patch: Partial<SandboxStage>) {
    setSandbox((current) => ({ ...current, stages: current.stages.map((stage) => stage.id === id ? { ...stage, ...patch } : stage) }))
  }

  function renderStageContent() {
    if (view === 'formula') {
      return <div className="counting-formula-view"><div className="counting-formula-view__badge"><Hash size={18} /> {principleLabels[analysis.principle]}</div><div className="counting-formula-view__expression">{concealed ? 'Faça sua previsão para revelar a fórmula' : analysis.formula}</div><p>{concealed ? 'A fórmula será construída a partir das escolhas que você já consegue ver.' : analysis.explanation}</p>{!concealed && <ol>{analysis.steps.map((step) => <li key={step}>{step}</li>)}</ol>}</div>
    }

    if (view === 'results') {
      return <div className="counting-results"><div className="counting-results__summary"><span>Resultados visíveis</span><strong>{concealed ? '—' : `${resultRows.length} de ${formatCount(analysis.total)}`}</strong></div>{concealed ? <div className="counting-locked"><LockKeyhole size={24} /><strong>Registre sua resposta primeiro</strong><span>Depois você poderá comparar sua previsão com cada resultado.</span></div> : <div className="counting-result-grid">{resultRows.map((row, index) => <span key={`${row.join('-')}-${index}`}>{row.join(' · ')}</span>)}</div>}{!concealed && analysis.total > BigInt(resultRows.length) && <p className="counting-sample-note">Amostra limitada para manter a visualização legível. O cálculo continua exato.</p>}</div>
    }

    if (view === 'tree') {
      return <div className="counting-tree"><div className="counting-tree__legend"><GitBranch size={17} /><span>Cada caminho completo representa um resultado.</span></div>{treeRows.length ? <ul className="counting-tree__root"><TreeBranch node={tree} root /></ul> : <div className="counting-locked"><ListTree size={25} /><strong>Nenhum caminho disponível</strong><span>Ajuste os parâmetros para criar possibilidades.</span></div>}<p className="counting-sample-note">A árvore exibe uma amostra de até 18 caminhos.</p></div>
    }

    const sandboxEditable = mode === 'sandbox' && (sandbox.technique === 'product' || sandbox.technique === 'sum')
    return <div className="counting-stages">
      {stages.map((stage, index) => <div className="counting-stage-wrap" key={stage.id}>
        <article className="counting-stage">
          <div className="counting-stage__heading">
            <span>{mode === 'sandbox' && sandbox.technique === 'sum' ? 'ALTERNATIVA' : 'ETAPA'} {index + 1}</span>
            <strong>{stage.options.length}</strong>
          </div>
          {sandboxEditable ? <>
            <input aria-label={`Nome da etapa ${index + 1}`} value={sandbox.stages[index].label} onChange={(event) => updateSandboxStage(stage.id, { label: event.target.value })} />
            <div className="counting-stepper"><button aria-label={`Diminuir ${stage.label}`} onClick={() => updateSandboxStage(stage.id, { count: Math.max(0, sandbox.stages[index].count - 1) })}>−</button><strong>{sandbox.stages[index].count}</strong><button aria-label={`Aumentar ${stage.label}`} onClick={() => updateSandboxStage(stage.id, { count: Math.min(30, sandbox.stages[index].count + 1) })}>+</button></div>
            {sandbox.stages.length > 1 && <button className="counting-stage__remove" aria-label={`Remover ${stage.label}`} onClick={() => setSandbox((current) => ({ ...current, stages: current.stages.filter((item) => item.id !== stage.id) }))}><Trash2 size={14} /> Remover</button>}
          </> : <>
            <h3>{stage.label}</h3>
            <div className="counting-options">{stage.options.slice(0, 12).map((option, optionIndex) => <span key={`${option}-${optionIndex}`}>{option}</span>)}{stage.options.length > 12 && <span className="is-more">+{stage.options.length - 12}</span>}</div>
          </>}
        </article>
        {index < stages.length - 1 && <div className="counting-connector"><span>{technique === 'sum' ? '+' : '×'}</span><small>{technique === 'sum' ? 'OU' : 'E DEPOIS'}</small></div>}
      </div>)}
      {sandboxEditable && <button className="counting-add-stage" onClick={() => setSandbox((current) => ({ ...current, stages: [...current.stages, { id: `sandbox-${Date.now()}`, label: `Etapa ${current.stages.length + 1}`, count: 2 }] }))}><Plus size={17} /> Adicionar etapa</button>}
    </div>
  }

  const stage = <div className="lab-card counting-lab">
    <div className="lab-toolbar counting-toolbar">
      <div><strong>{mode === 'explore' ? 'Construtor de senhas' : mode === 'challenges' ? challenge.title : mode === 'sandbox' ? 'Construtor de cenários' : 'Escolhas para um traje'}</strong><span>{stages.length} {stages.length === 1 ? 'grupo' : 'etapas'} · {concealed ? 'resultado protegido' : `${formatCount(analysis.total)} possibilidades`}</span></div>
      {mode === 'sandbox' && <label>Técnica<select aria-label="Técnica de contagem" value={sandbox.technique} onChange={(event) => setSandbox((current) => ({ ...current, technique: event.target.value as SandboxTechnique }))}>{Object.entries(principleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>}
    </div>
    <div className="counting-viewbar" role="tablist" aria-label="Visualização da contagem">{(Object.keys(viewLabels) as CountingView[]).map((item) => <button role="tab" aria-selected={view === item} className={view === item ? 'is-active' : ''} key={item} disabled={concealed && (item === 'results' || item === 'formula')} onClick={() => setView(item)}>{viewLabels[item]}</button>)}</div>
    {mode === 'sandbox' && !['product', 'sum'].includes(sandbox.technique) && <div className="counting-parameters">
      {sandbox.technique === 'multiset-permutation' ? <label>Multiplicidades<input type="text" aria-label="Multiplicidades" value={sandbox.groups} onChange={(event) => setSandbox((current) => ({ ...current, groups: event.target.value }))} placeholder="Ex.: 2, 1" /></label> : <><label>Total de elementos<input type="number" min="0" max="20" aria-label="Total de elementos" value={sandbox.n} onChange={(event) => setSandbox((current) => ({ ...current, n: Math.max(0, Number(event.target.value)) }))} /></label>{sandbox.technique !== 'permutation' && <label>Quantidade escolhida<input type="number" min="0" max={sandbox.n} aria-label="Quantidade escolhida" value={sandbox.k} onChange={(event) => setSandbox((current) => ({ ...current, k: Math.max(0, Number(event.target.value)) }))} /></label>}</>}
    </div>}
    <div className="counting-stage-area">{renderStageContent()}</div>
  </div>

  let inspector
  if (mode === 'learn' && !revealed) {
    inspector = <section className="investigation counting-prediction"><div className="eyebrow"><Lightbulb size={15} /> Antes de calcular</div><h3>Quantos trajes diferentes podem ser formados?</h3><p className="muted">Escolha uma camiseta e depois uma calça. Registre o total de caminhos que você espera encontrar.</p><label>Sua previsão<input type="number" min="0" aria-label="Sua previsão" value={prediction} onChange={(event) => setPrediction(event.target.value)} placeholder="Digite um número" /></label><button className="button button--primary button--wide" disabled={!prediction.trim()} onClick={revealLearn}><LockKeyhole size={16} /> Registrar e analisar</button></section>
  } else if (mode === 'explore') {
    inspector = <section className="investigation counting-inspector"><div className="eyebrow"><ShieldCheck size={15} /> Espaço de busca</div><div className="counting-controls"><label>Posições de letras<input type="number" min="0" max="6" value={password.letterPositions} onChange={(event) => setPassword((current) => ({ ...current, letterPositions: Math.max(0, Math.min(6, Number(event.target.value))) }))} /></label><label>Posições de dígitos<input type="number" min="0" max="6" value={password.digitPositions} onChange={(event) => setPassword((current) => ({ ...current, digitPositions: Math.max(0, Math.min(6, Number(event.target.value))) }))} /></label><label className="counting-check"><input type="checkbox" checked={password.allowRepetition} onChange={(event) => setPassword((current) => ({ ...current, allowRepetition: event.target.checked }))} /> Permitir repetição</label><label className="counting-check"><input type="checkbox" disabled={password.letterPositions > 0 || password.digitPositions === 0} checked={password.noLeadingZero} onChange={(event) => setPassword((current) => ({ ...current, noLeadingZero: event.target.checked }))} /> Primeiro dígito não pode ser zero</label></div><ResultInspector analysis={analysis} /><div className="counting-security"><Clock3 size={18} /><div><span>Força bruta a 1 milhão/s</span><strong>{estimateAttackTime(analysis.total, 1_000_000n)}</strong></div></div></section>
  } else if (mode === 'challenges') {
    inspector = <section className="investigation counting-challenge"><div className="eyebrow">Desafio {challengeIndex + 1} de {challenges.length}</div><h3>{challenge.prompt}</h3><label>Qual técnica se aplica?<select aria-label="Técnica do desafio" value={challengePrinciple} onChange={(event) => { setChallengePrinciple(event.target.value as CountingPrinciple); setChallengeSubmitted(false) }}><option value="">Selecione…</option>{Object.entries(principleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Qual é o total?<input type="text" inputMode="numeric" aria-label="Resposta do desafio" value={challengeAnswer} onChange={(event) => { setChallengeAnswer(event.target.value.replace(/\D/g, '')); setChallengeSubmitted(false) }} placeholder="Digite sua resposta" /></label><button className="button button--primary button--wide" disabled={!challengePrinciple || !challengeAnswer} onClick={submitChallenge}>Verificar solução</button>{challengeSubmitted && <div className={`feedback-note ${challengeCorrect ? 'is-success' : 'is-review'}`}><strong>{challengeCorrect ? 'Desafio resolvido' : 'Revise a estrutura'}</strong><span>{challengeCorrect ? analysis.formula : `${principleLabels[challenge.principle]} organiza este problema. Observe se a ordem importa e tente novamente.`}</span></div>}{challengeCorrect && challengeIndex < challenges.length - 1 && <button className="button button--secondary button--wide" onClick={nextChallenge}>Próximo desafio <ChevronRight size={16} /></button>}{challengeCorrect && challengeIndex === challenges.length - 1 && <div className="challenge-banner is-success"><CheckCircle2 size={17} /><strong>Sequência concluída</strong><span>Você relacionou estruturas diferentes às regras de contagem.</span></div>}</section>
  } else {
    inspector = <section className="investigation counting-inspector"><div className="eyebrow"><Sparkles size={15} /> Análise da estrutura</div>{mode === 'learn' && <div className={`feedback-note ${answerMatches(prediction, analysis.total) ? 'is-success' : 'is-review'}`}><strong>{answerMatches(prediction, analysis.total) ? 'Previsão confirmada' : 'Previsão revisada'}</strong><span>Você estimou {prediction || '—'}; a árvore contém {formatCount(analysis.total)} caminhos completos.</span></div>}<ResultInspector analysis={analysis} />{mode === 'sandbox' && <div className="counting-decision"><strong>Como reconhecer?</strong><span>{analysis.explanation}</span></div>}</section>
  }

  const titles: Record<Mode, [string, string, string]> = {
    learn: ['Missão 9 · Escolhas em etapas', 'Quantos caminhos cabem em uma escolha?', 'Construa os resultados e descubra por que escolhas sucessivas se multiplicam.'],
    explore: ['Cenário preparado · Segurança', 'Quão grande pode ser uma senha?', 'Altere o formato da senha e acompanhe o crescimento do espaço de busca.'],
    sandbox: ['Laboratório aberto', 'Construa seu próprio espaço de busca', 'Modele etapas, alternativas e seleções para comparar as principais regras de contagem.'],
    challenges: ['Nível 6 · Escolha da técnica', 'Escolha a regra antes da fórmula', 'Classifique cada problema e calcule o resultado sem depender de tentativa e erro.'],
  }

  return <StudioScaffold
    eyebrow={titles[mode][0]}
    title={titles[mode][1]}
    description={titles[mode][2]}
    controls={<button className="icon-button" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button>}
    stage={stage}
    inspector={inspector}
    footer={<><div className="footer-status"><Sparkles size={16} /> {mode === 'sandbox' ? 'Seu cenário é salvo automaticamente neste dispositivo.' : 'Conte caminhos pequenos; use fórmulas para espaços grandes.'}</div><button className="button button--ghost" disabled={concealed} onClick={() => setView('formula')}>Ver derivação <ArrowRight size={15} /></button></>}
  />
}

function ResultInspector({ analysis }: { analysis: CountingAnalysis }) {
  return <><div className="counting-total"><span>Total de possibilidades</span><strong>{formatCount(analysis.total)}</strong><small>{principleLabels[analysis.principle]}</small></div><section className="counting-reasoning"><h3>Por que esta regra?</h3><p>{analysis.explanation}</p><div className="counting-formula-inline">{analysis.formula}</div><ol>{analysis.steps.map((step) => <li key={step}>{step}</li>)}</ol></section></>
}
