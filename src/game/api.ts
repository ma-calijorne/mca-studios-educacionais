import type { GameAccess, GameAdminOverview, GameState, MissionSubmission } from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Não foi possível concluir a operação.')
  }
  return response.json() as Promise<T>
}

export const getGameAccess = () => request<GameAccess>('/api/game/access')
export const getGameState = () => request<GameState>('/api/game/state')
export const createGameTeam = (name: string) => request<GameState>('/api/game/teams', { method: 'POST', body: JSON.stringify({ name }) })
export const joinGameTeam = (code: string) => request<GameState>('/api/game/teams/join', { method: 'POST', body: JSON.stringify({ code }) })
export const submitMission = (missionId: string, submission: MissionSubmission) => request<{ validation: { correct: boolean; feedback: string; seal?: string }; state: GameState }>(`/api/game/missions/${encodeURIComponent(missionId)}/submit`, { method: 'POST', body: JSON.stringify(submission) })
export const useMissionHint = (missionId: string) => request<{ hint: string; state: GameState }>(`/api/game/missions/${encodeURIComponent(missionId)}/hint`, { method: 'POST', body: '{}' })
export const submitFinalKey = (key: string) => request<{ correct: boolean; feedback?: string; state: GameState }>('/api/game/final', { method: 'POST', body: JSON.stringify({ key }) })

export const getGameAdmin = () => request<GameAdminOverview>('/api/admin/game')
export const setGameAccess = (enabled: boolean) => request<GameAccess>('/api/admin/game/access', { method: 'PUT', body: JSON.stringify({ enabled }) })
export const createGameSession = (title?: string) => request<GameAccess>('/api/admin/game/sessions', { method: 'POST', body: JSON.stringify({ title }) })
