import { randomBytes, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { GAME_TITLE, assertEvidence, getMissionHint, publicMissions, validateFinalKey, validateMissionAnswer } from './game-content.mjs'

function gameError(message, code, status = 400) {
  const error = new Error(message)
  error.code = code
  error.status = status
  return error
}

class CloudRunAccessToken {
  constructor() {
    this.value = ''
    this.expiresAt = 0
  }

  async get(forceRefresh = false) {
    if (!forceRefresh && this.value && Date.now() < this.expiresAt) return this.value
    const response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
    })
    if (!response.ok) throw gameError('Não foi possível autenticar o backup do jogo.', 'GAME_STORAGE_AUTH', 503)
    const token = await response.json()
    this.value = token.access_token
    this.expiresAt = Date.now() + Math.max(60, Number(token.expires_in) - 120) * 1000
    return this.value
  }
}

class GcsSqliteRepository {
  constructor(bucketName, objectName, accessToken = new CloudRunAccessToken()) {
    this.bucketName = bucketName
    this.objectName = objectName
    this.accessToken = accessToken
    this.generation = '0'
  }

  objectUrl(search = '') {
    return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(this.objectName)}${search}`
  }

  async request(url, options = {}, retry = true) {
    const token = await this.accessToken.get(!retry)
    const response = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } })
    if (response.status === 401 && retry) return this.request(url, options, false)
    return response
  }

  async restore(targetFile) {
    const metadataResponse = await this.request(this.objectUrl())
    if (metadataResponse.status === 404) return false
    if (!metadataResponse.ok) throw gameError('Não foi possível localizar o backup do jogo.', 'GAME_STORAGE_READ', 503)
    const metadata = await metadataResponse.json()
    this.generation = String(metadata.generation)
    const mediaResponse = await this.request(this.objectUrl(`?alt=media&generation=${encodeURIComponent(this.generation)}`))
    if (!mediaResponse.ok) throw gameError('Não foi possível restaurar o banco do jogo.', 'GAME_STORAGE_RESTORE', 503)
    await writeFile(targetFile, new Uint8Array(await mediaResponse.arrayBuffer()))
    return true
  }

  async save(sourceFile) {
    const query = new URLSearchParams({
      uploadType: 'media',
      name: this.objectName,
      ifGenerationMatch: this.generation,
    })
    const response = await this.request(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucketName)}/o?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.sqlite3', 'Cache-Control': 'no-store' },
      body: await readFile(sourceFile),
    })
    if (response.status === 412) {
      throw gameError('O backup do jogo mudou em outra instância. A gravação foi interrompida para proteger os dados.', 'GAME_STORAGE_CONFLICT', 409)
    }
    if (!response.ok) throw gameError('Não foi possível salvar o backup do jogo.', 'GAME_STORAGE_WRITE', 503)
    const metadata = await response.json()
    this.generation = String(metadata.generation)
  }
}

class LocalSqliteRepository {
  async restore() { return false }
  async save(sourceFile, targetFile) {
    if (sourceFile === targetFile) return
    await copyFile(sourceFile, targetFile)
  }
}

function cleanTeamName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 48) throw gameError('O nome da equipe deve ter entre 2 e 48 caracteres.', 'INVALID_TEAM_NAME')
  return name
}

function cleanText(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max)
}

function createTeamCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function plain(row) {
  return row ? { ...row } : null
}

export class GameDatabase {
  constructor({ localFile, bucketName, objectName = 'game/o-ultimo-axioma.sqlite', accessToken } = {}) {
    this.inMemory = localFile === ':memory:'
    this.localFile = this.inMemory ? ':memory:' : path.resolve(localFile ?? '/tmp/mca-o-ultimo-axioma.sqlite')
    this.snapshotFile = this.inMemory ? path.resolve('/tmp/mca-o-ultimo-axioma-test.snapshot') : `${this.localFile}.snapshot`
    this.repository = bucketName
      ? new GcsSqliteRepository(bucketName, objectName, accessToken)
      : new LocalSqliteRepository()
    this.remote = Boolean(bucketName)
    this.db = null
    this.writeQueue = Promise.resolve()
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return this
    if (!this.inMemory) await mkdir(path.dirname(this.localFile), { recursive: true })
    if (this.remote) await this.repository.restore(this.localFile)
    this.db = new DatabaseSync(this.localFile)
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;')
    this.migrate()
    this.initialized = true
    if (this.remote && this.repository.generation === '0') await this.snapshot()
    return this
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS game_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
        created_at TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL DEFAULT 0,
        fragments INTEGER NOT NULL DEFAULT 4,
        current_stage INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS team_members (
        session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_ra TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        PRIMARY KEY (session_id, student_id)
      );
      CREATE TABLE IF NOT EXISTS mission_progress (
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        mission_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'attempted',
        attempts INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL DEFAULT 0,
        prediction TEXT,
        evidence_json TEXT,
        answer_json TEXT,
        feedback TEXT,
        hint_used INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (team_id, mission_id)
      );
      CREATE TABLE IF NOT EXISTS game_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_teams_session ON teams(session_id);
      CREATE INDEX IF NOT EXISTS idx_members_team ON team_members(team_id);
      CREATE INDEX IF NOT EXISTS idx_events_session ON game_events(session_id, created_at);
    `)
    const now = new Date().toISOString()
    this.db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run('game_enabled', 'false', now)
  }

  transaction(callback) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = callback()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  async mutate(callback) {
    const operation = this.writeQueue.then(async () => {
      const result = this.transaction(callback)
      await this.snapshot()
      return result
    })
    this.writeQueue = operation.catch(() => undefined)
    return operation
  }

  async snapshot() {
    if (!this.db || this.inMemory) return
    await rm(this.snapshotFile, { force: true })
    const escaped = this.snapshotFile.replaceAll("'", "''")
    this.db.exec(`VACUUM INTO '${escaped}'`)
    if (this.remote) await this.repository.save(this.snapshotFile)
    await rm(this.snapshotFile, { force: true })
  }

  async close() {
    await this.writeQueue
    if (this.db) {
      try { await this.snapshot() } finally { this.db.close(); this.db = null }
    }
  }

  enabled() {
    return this.db.prepare('SELECT value FROM settings WHERE key = ?').get('game_enabled')?.value === 'true'
  }

  activeSession() {
    return plain(this.db.prepare("SELECT * FROM game_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get())
  }

  ensureActiveSession(now) {
    let session = this.activeSession()
    if (session) return session
    const id = randomUUID()
    const title = `Expedição ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(now))}`
    this.db.prepare('INSERT INTO game_sessions (id, title, status, created_at, started_at) VALUES (?, ?, ?, ?, ?)').run(id, title, 'active', now, now)
    session = this.activeSession()
    this.recordEvent(session.id, null, 'session_created', { title })
    return session
  }

  recordEvent(sessionId, teamId, type, payload = {}) {
    this.db.prepare('INSERT INTO game_events (id, session_id, team_id, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), sessionId, teamId, type, JSON.stringify(payload), new Date().toISOString())
  }

  getAccess() {
    const session = this.activeSession()
    return {
      enabled: this.enabled(),
      title: GAME_TITLE,
      session: session ? { id: session.id, title: session.title, startedAt: session.started_at } : null,
    }
  }

  async setEnabled(enabled) {
    return this.mutate(() => {
      const now = new Date().toISOString()
      const normalized = Boolean(enabled)
      let session = this.activeSession()
      if (normalized) session = this.ensureActiveSession(now)
      this.db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(String(normalized), now, 'game_enabled')
      if (session) this.recordEvent(session.id, null, normalized ? 'access_enabled' : 'access_disabled')
      return this.getAccess()
    })
  }

  async newSession(title) {
    return this.mutate(() => {
      const now = new Date().toISOString()
      this.db.prepare("UPDATE game_sessions SET status = 'ended', ended_at = ? WHERE status = 'active'").run(now)
      const id = randomUUID()
      const cleanTitle = cleanText(title, 80) || `Expedição ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date())}`
      this.db.prepare('INSERT INTO game_sessions (id, title, status, created_at, started_at) VALUES (?, ?, ?, ?, ?)').run(id, cleanTitle, 'active', now, now)
      this.recordEvent(id, null, 'session_created', { title: cleanTitle })
      return this.getAccess()
    })
  }

  memberTeam(sessionId, studentId) {
    return plain(this.db.prepare(`
      SELECT t.* FROM teams t
      JOIN team_members m ON m.team_id = t.id
      WHERE m.session_id = ? AND m.student_id = ?
      LIMIT 1
    `).get(sessionId, studentId))
  }

  teamByCode(sessionId, code) {
    return plain(this.db.prepare('SELECT * FROM teams WHERE session_id = ? AND code = ?').get(sessionId, String(code ?? '').trim().toUpperCase()))
  }

  generateUniqueCode() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = createTeamCode()
      if (!this.db.prepare('SELECT 1 FROM teams WHERE code = ?').get(code)) return code
    }
    throw gameError('Não foi possível criar um código de equipe.', 'TEAM_CODE_FAILURE', 500)
  }

  assertGameOpen() {
    if (!this.enabled()) throw gameError('O professor ainda não liberou o jogo.', 'GAME_LOCKED', 403)
    const session = this.activeSession()
    if (!session) throw gameError('Não há uma expedição ativa.', 'NO_ACTIVE_SESSION', 409)
    return session
  }

  async createTeam(student, input) {
    return this.mutate(() => {
      const session = this.assertGameOpen()
      if (this.memberTeam(session.id, student.sub)) throw gameError('Você já faz parte de uma equipe nesta expedição.', 'ALREADY_IN_TEAM', 409)
      const now = new Date().toISOString()
      const team = { id: randomUUID(), sessionId: session.id, name: cleanTeamName(input?.name), code: this.generateUniqueCode(), createdAt: now }
      this.db.prepare('INSERT INTO teams (id, session_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)').run(team.id, team.sessionId, team.name, team.code, now)
      this.db.prepare('INSERT INTO team_members (session_id, team_id, student_id, student_name, student_ra, joined_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(session.id, team.id, student.sub, student.name, student.ra, now)
      this.recordEvent(session.id, team.id, 'team_created', { name: team.name, studentId: student.sub })
      return this.studentState(student)
    })
  }

  async joinTeam(student, input) {
    return this.mutate(() => {
      const session = this.assertGameOpen()
      if (this.memberTeam(session.id, student.sub)) throw gameError('Você já faz parte de uma equipe nesta expedição.', 'ALREADY_IN_TEAM', 409)
      const team = this.teamByCode(session.id, input?.code)
      if (!team) throw gameError('Código de equipe inválido para esta expedição.', 'TEAM_NOT_FOUND', 404)
      const now = new Date().toISOString()
      this.db.prepare('INSERT INTO team_members (session_id, team_id, student_id, student_name, student_ra, joined_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(session.id, team.id, student.sub, student.name, student.ra, now)
      this.recordEvent(session.id, team.id, 'member_joined', { studentId: student.sub, name: student.name })
      return this.studentState(student)
    })
  }

  teamMembers(teamId) {
    return this.db.prepare('SELECT student_name AS name, student_ra AS ra, joined_at AS joinedAt FROM team_members WHERE team_id = ? ORDER BY joined_at').all(teamId).map(plain)
  }

  teamProgress(teamId) {
    const rows = this.db.prepare('SELECT * FROM mission_progress WHERE team_id = ?').all(teamId)
    return new Map(rows.map((row) => [row.mission_id, plain(row)]))
  }

  leaderboard(sessionId) {
    return this.db.prepare(`
      SELECT name, score, current_stage AS stage, completed_at AS completedAt
      FROM teams WHERE session_id = ?
      ORDER BY score DESC, current_stage DESC, COALESCE(completed_at, '9999') ASC, created_at ASC
      LIMIT 20
    `).all(sessionId).map(plain)
  }

  studentState(student) {
    const access = this.getAccess()
    if (!access.enabled || !access.session) return { access, team: null, missions: [], leaderboard: [] }
    const team = this.memberTeam(access.session.id, student.sub)
    if (!team) return { access, team: null, missions: publicMissions.map((mission, index) => ({ ...mission, seal: undefined, status: index === 0 ? 'available' : 'locked' })), leaderboard: this.leaderboard(access.session.id) }
    const progress = this.teamProgress(team.id)
    const missionStates = publicMissions.map((mission) => {
      const record = progress.get(mission.id)
      const completed = record?.status === 'completed'
      const available = mission.order === team.current_stage + 1
      return {
        ...mission,
        seal: completed ? mission.seal : undefined,
        status: completed ? 'completed' : available ? 'available' : 'locked',
        attempts: record?.attempts ?? 0,
        feedback: record?.feedback ?? null,
        hintUsed: Boolean(record?.hint_used),
      }
    })
    return {
      access,
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
        score: team.score,
        fragments: team.fragments,
        currentStage: team.current_stage,
        completedAt: team.completed_at,
        members: this.teamMembers(team.id),
        finalUnlocked: team.current_stage >= publicMissions.length,
      },
      missions: missionStates,
      leaderboard: this.leaderboard(access.session.id),
    }
  }

  getStudentState(student) {
    return this.studentState(student)
  }

  teamForOpenGame(student) {
    const session = this.assertGameOpen()
    const team = this.memberTeam(session.id, student.sub)
    if (!team) throw gameError('Crie uma equipe ou entre em uma antes de investigar os selos.', 'TEAM_REQUIRED', 409)
    return { session, team }
  }

  async submitMission(student, missionId, input) {
    return this.mutate(() => {
      const { session, team } = this.teamForOpenGame(student)
      const mission = publicMissions.find((item) => item.id === missionId)
      if (!mission) throw gameError('Selo não encontrado.', 'MISSION_NOT_FOUND', 404)
      if (mission.order !== team.current_stage + 1) throw gameError('Este selo ainda está bloqueado.', 'MISSION_LOCKED', 409)
      const evidence = assertEvidence(input?.evidence)
      const prediction = cleanText(input?.prediction, 500)
      if (prediction.length < 2) throw gameError('Registre a previsão da equipe antes de validar.', 'PREDICTION_REQUIRED')
      const validation = validateMissionAnswer(missionId, input?.answer ?? {})
      const now = new Date().toISOString()
      const existing = this.db.prepare('SELECT attempts, hint_used FROM mission_progress WHERE team_id = ? AND mission_id = ?').get(team.id, missionId)
      const attempts = Number(existing?.attempts ?? 0) + 1
      const status = validation.correct ? 'completed' : 'attempted'
      const score = validation.correct ? 100 : 0
      this.db.prepare(`
        INSERT INTO mission_progress (team_id, mission_id, status, attempts, score, prediction, evidence_json, answer_json, feedback, hint_used, completed_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(team_id, mission_id) DO UPDATE SET
          status = excluded.status, attempts = excluded.attempts, score = excluded.score,
          prediction = excluded.prediction, evidence_json = excluded.evidence_json,
          answer_json = excluded.answer_json, feedback = excluded.feedback,
          completed_at = excluded.completed_at, updated_at = excluded.updated_at
      `).run(team.id, missionId, status, attempts, score, prediction, JSON.stringify(evidence), JSON.stringify(input?.answer ?? {}), validation.feedback, Number(existing?.hint_used ?? 0), validation.correct ? now : null, now)
      if (validation.correct) {
        this.db.prepare('UPDATE teams SET score = score + 100, current_stage = ? WHERE id = ?').run(mission.order, team.id)
        this.recordEvent(session.id, team.id, 'mission_completed', { missionId, attempts, seal: validation.seal })
      } else {
        this.recordEvent(session.id, team.id, 'mission_attempted', { missionId, attempts })
      }
      return { validation, state: this.studentState(student) }
    })
  }

  async useHint(student, missionId) {
    return this.mutate(() => {
      const { session, team } = this.teamForOpenGame(student)
      const mission = publicMissions.find((item) => item.id === missionId)
      if (!mission || mission.order !== team.current_stage + 1) throw gameError('A dica não está disponível para este selo.', 'HINT_LOCKED', 409)
      const existing = this.db.prepare('SELECT hint_used FROM mission_progress WHERE team_id = ? AND mission_id = ?').get(team.id, missionId)
      if (existing?.hint_used) throw gameError('A equipe já abriu a dica deste selo.', 'HINT_ALREADY_USED', 409)
      if (team.fragments < 1) throw gameError('A equipe não possui fragmentos de pista.', 'NO_HINT_FRAGMENTS', 409)
      const now = new Date().toISOString()
      this.db.prepare('UPDATE teams SET fragments = fragments - 1 WHERE id = ?').run(team.id)
      this.db.prepare(`
        INSERT INTO mission_progress (team_id, mission_id, status, attempts, score, hint_used, updated_at)
        VALUES (?, ?, 'attempted', 0, 0, 1, ?)
        ON CONFLICT(team_id, mission_id) DO UPDATE SET hint_used = 1, updated_at = excluded.updated_at
      `).run(team.id, missionId, now)
      this.recordEvent(session.id, team.id, 'hint_used', { missionId })
      return { hint: getMissionHint(missionId), state: this.studentState(student) }
    })
  }

  async submitFinal(student, input) {
    return this.mutate(() => {
      const { session, team } = this.teamForOpenGame(student)
      if (team.current_stage < publicMissions.length) throw gameError('Os sete selos precisam estar completos.', 'FINAL_LOCKED', 409)
      if (team.completed_at) return { correct: true, state: this.studentState(student) }
      const correct = validateFinalKey(input?.key)
      const now = new Date().toISOString()
      if (correct) {
        this.db.prepare('UPDATE teams SET score = score + 200, completed_at = ? WHERE id = ?').run(now, team.id)
        this.recordEvent(session.id, team.id, 'final_completed', { key: 'PARADOX-128-1' })
      } else {
        this.recordEvent(session.id, team.id, 'final_attempted')
      }
      return { correct, feedback: correct ? 'O paradoxo foi contido. A expedição está encerrada.' : 'A chave ainda não combina os sete selos, as configurações e a condição final.', state: this.studentState(student) }
    })
  }

  adminOverview() {
    const access = this.getAccess()
    const sessions = this.db.prepare(`
      SELECT s.id, s.title, s.status, s.started_at AS startedAt, s.ended_at AS endedAt,
        COUNT(DISTINCT t.id) AS teams, COUNT(DISTINCT m.student_id) AS students
      FROM game_sessions s
      LEFT JOIN teams t ON t.session_id = s.id
      LEFT JOIN team_members m ON m.team_id = t.id
      GROUP BY s.id ORDER BY s.started_at DESC LIMIT 12
    `).all().map(plain)
    const teams = access.session ? this.db.prepare(`
      SELECT t.id, t.name, t.code, t.score, t.fragments, t.current_stage AS currentStage, t.completed_at AS completedAt,
        COUNT(m.student_id) AS memberCount
      FROM teams t LEFT JOIN team_members m ON m.team_id = t.id
      WHERE t.session_id = ? GROUP BY t.id
      ORDER BY t.score DESC, t.current_stage DESC, t.created_at ASC
    `).all(access.session.id).map(plain) : []
    return { access, sessions, teams, missionCount: publicMissions.length, maxScore: 900 }
  }
}

export async function createGameDatabase(options = {}) {
  return new GameDatabase(options).initialize()
}
