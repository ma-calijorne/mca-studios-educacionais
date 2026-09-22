export type Mode = 'learn' | 'explore' | 'sandbox' | 'challenges'

export type TopicId =
  | 'sets'
  | 'relations'
  | 'functions'
  | 'logic'
  | 'truth-tables'
  | 'equivalences'
  | 'logic-algorithms'
  | 'digital-circuits'
  | 'counting'

export type EvidenceKind =
  | 'witness'
  | 'counterexample'
  | 'missing'
  | 'violation'
  | 'coverage'
  | 'derivation'
  | 'trace'

export interface Evidence {
  id: string
  kind: EvidenceKind
  title: string
  explanation: string
  refs?: string[]
}

export interface AnalysisResult {
  id: string
  label: string
  value: boolean | null
  summary: string
  evidence: Evidence[]
}

export interface JournalEntry {
  id: string
  at: number
  topic: TopicId
  kind: 'prediction' | 'action' | 'discovery' | 'hint' | 'reset'
  message: string
}

export interface TopicDefinition {
  id: TopicId
  title: string
  shortTitle: string
  description: string
  accent: string
  icon: string
}

export const topics: TopicDefinition[] = [
  {
    id: 'sets',
    title: 'Estúdio de Coleções',
    shortTitle: 'Conjuntos',
    description: 'Organize elementos e veja operações acontecerem.',
    accent: '#5eead4',
    icon: '∪',
  },
  {
    id: 'relations',
    title: 'Estúdio de Redes e Vínculos',
    shortTitle: 'Relações',
    description: 'Construa pares e investigue propriedades.',
    accent: '#60a5fa',
    icon: '↔',
  },
  {
    id: 'functions',
    title: 'Estúdio de Atribuições',
    shortTitle: 'Funções',
    description: 'Conecte entradas, saídas e classificações.',
    accent: '#c084fc',
    icon: 'ƒ',
  },
  {
    id: 'logic',
    title: 'Estúdio de Afirmações',
    shortTitle: 'Lógica',
    description: 'Monte expressões e observe seu valor lógico.',
    accent: '#f472b6',
    icon: '∧',
  },
  {
    id: 'truth-tables',
    title: 'Estúdio de Casos Possíveis',
    shortTitle: 'Tabelas-Verdade',
    description: 'Investigue todas as valorações possíveis.',
    accent: '#fbbf24',
    icon: '⊤',
  },
  {
    id: 'equivalences',
    title: 'Oficina de Transformações',
    shortTitle: 'Equivalências',
    description: 'Aplique leis sem alterar o significado.',
    accent: '#fb923c',
    icon: '≡',
  },
  {
    id: 'logic-algorithms',
    title: 'Laboratório de Decisões',
    shortTitle: 'Lógica em Algoritmos',
    description: 'Ligue predicados, código e execução.',
    accent: '#a3e635',
    icon: '{}',
  },
  {
    id: 'digital-circuits',
    title: 'Estúdio de Sinais e Portas',
    shortTitle: 'Circuitos Digitais',
    description: 'Construa circuitos e acompanhe sinais booleanos.',
    accent: '#22d3ee',
    icon: '⏻',
  },
  {
    id: 'counting',
    title: 'Estúdio de Espaços de Possibilidades',
    shortTitle: 'Contagem',
    description: 'Construa escolhas e meça o espaço de busca.',
    accent: '#818cf8',
    icon: '#',
  },
]

export const modeLabels: Record<Mode, string> = {
  learn: 'Aprender',
  explore: 'Explorar',
  sandbox: 'Sandbox',
  challenges: 'Desafios',
}
