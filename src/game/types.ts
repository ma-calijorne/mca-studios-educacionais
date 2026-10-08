export interface GameAccess {
  enabled: boolean
  title: string
  session: null | { id: string; title: string; startedAt: string }
}

export type MissionStatus = 'locked' | 'available' | 'completed'

export interface GameMission {
  id: string
  order: number
  seal?: string
  title: string
  studio: string
  duration: number
  atmosphere: string
  objective: string
  brief: Record<string, unknown>
  answerKind: 'set' | 'relation' | 'function' | 'logic' | 'algorithm' | 'circuit' | 'counting'
  status: MissionStatus
  attempts?: number
  feedback?: string | null
  hintUsed?: boolean
}

export interface GameTeam {
  id: string
  name: string
  code: string
  score: number
  fragments: number
  currentStage: number
  completedAt: string | null
  finalUnlocked: boolean
  members: Array<{ name: string; ra: string; joinedAt: string }>
}

export interface LeaderboardEntry {
  name: string
  score: number
  stage: number
  completedAt: string | null
}

export interface GameState {
  access: GameAccess
  team: GameTeam | null
  missions: GameMission[]
  leaderboard: LeaderboardEntry[]
}

export interface GameAdminOverview {
  access: GameAccess
  missionCount: number
  maxScore: number
  sessions: Array<{ id: string; title: string; status: 'active' | 'ended'; startedAt: string; endedAt: string | null; teams: number; students: number }>
  teams: Array<{ id: string; name: string; code: string; score: number; fragments: number; currentStage: number; completedAt: string | null; memberCount: number }>
}

export interface MissionSubmission {
  prediction: string
  evidence: { representation: string; result: string; test: string; explanation: string }
  answer: Record<string, unknown>
}
