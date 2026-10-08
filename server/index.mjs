import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import { createGameDatabase } from './game-database.mjs'
import { createLoginEventStore } from './login-event-store.mjs'
import { createStudentStore, validateRa } from './student-store.mjs'
import { expiredSessionCookie, parseCookies, safeEqual, sessionCookie, signSession, verifySession } from './session.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 8080)
const sessionSecret = process.env.SESSION_SECRET ?? (production ? '' : 'local-development-session-secret-change-me')
const adminKey = process.env.ADMIN_KEY ?? (production ? '' : 'admin-local')
const loginAttemptLimit = Math.max(1, Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 15))

if (!sessionSecret || !adminKey) throw new Error('SESSION_SECRET e ADMIN_KEY são obrigatórios em produção.')

const store = createStudentStore({
  bucketName: process.env.STUDENTS_BUCKET,
  objectName: process.env.STUDENTS_OBJECT ?? 'students.json',
  localFile: process.env.STUDENTS_FILE,
})
const loginEvents = createLoginEventStore({
  bucketName: process.env.STUDENTS_BUCKET,
  prefix: process.env.LOGIN_EVENTS_PREFIX ?? 'login-events',
  localFile: process.env.LOGIN_EVENTS_FILE,
})
const gameDatabase = await createGameDatabase({
  bucketName: process.env.GAME_DB_BUCKET ?? process.env.STUDENTS_BUCKET,
  objectName: process.env.GAME_DB_OBJECT ?? 'game/o-ultimo-axioma.sqlite',
  localFile: process.env.GAME_DB_FILE ?? (production ? '/tmp/mca-o-ultimo-axioma.sqlite' : 'server/data/game.local.sqlite'),
})

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({ crossOriginEmbedderPolicy: false }))
app.use(express.json({ limit: '32kb' }))
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})

const attempts = new Map()
function loginRateLimit(request, response, next) {
  const now = Date.now()
  const key = request.ip ?? 'unknown'
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return next()
  }
  current.count += 1
  if (current.count > loginAttemptLimit) {
    response.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
    return response.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' })
  }
  next()
}

function currentSession(request) {
  const token = parseCookies(request.headers.cookie).mci_session
  return verifySession(token, sessionSecret)
}

function requireAdmin(request, response, next) {
  const session = currentSession(request)
  if (session?.role !== 'admin') return response.status(403).json({ error: 'Acesso administrativo necessário.' })
  request.session = session
  next()
}

function requireStudent(request, response, next) {
  const session = currentSession(request)
  if (session?.role !== 'student') return response.status(403).json({ error: 'Acesso de aluno necessário.' })
  request.session = session
  next()
}

app.get('/health', (_request, response) => response.type('text/plain').send('ok'))

app.get('/api/session', async (request, response, next) => {
  try {
    const session = currentSession(request)
    if (!session) return response.json({ authenticated: false })
    if (session.role === 'student') {
      const student = await store.findActiveByRa(session.ra)
      if (!student || student.id !== session.sub) {
        response.set('Set-Cookie', expiredSessionCookie(production))
        return response.json({ authenticated: false })
      }
      return response.json({ authenticated: true, user: { name: student.name, ra: student.ra, role: 'student' } })
    }
    response.json({ authenticated: true, user: { name: session.name, role: 'admin' } })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/student', loginRateLimit, async (request, response, next) => {
  try {
    if (!validateRa(request.body?.ra)) return response.status(401).json({ error: 'RA não encontrada ou inativa.' })
    const student = await store.findActiveByRa(request.body.ra)
    if (!student) return response.status(401).json({ error: 'RA não encontrada ou inativa.' })
    try {
      await loginEvents.record(student)
    } catch (error) {
      console.error(JSON.stringify({ severity: 'WARNING', message: 'Não foi possível registrar o acesso do aluno.', code: error.code }))
    }
    const maxAge = 12 * 60 * 60
    const token = signSession({ sub: student.id, name: student.name, ra: student.ra, role: 'student' }, sessionSecret, maxAge)
    response.set('Set-Cookie', sessionCookie(token, maxAge, production))
    response.json({ user: { name: student.name, ra: student.ra, role: 'student' } })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/admin', loginRateLimit, (request, response) => {
  const suppliedKey = String(request.body?.key ?? '').trim()
  if (!safeEqual(suppliedKey, adminKey)) return response.status(401).json({ error: 'Chave administrativa inválida.' })
  const maxAge = 4 * 60 * 60
  const token = signSession({ sub: 'administrator', name: 'Administrador', role: 'admin' }, sessionSecret, maxAge)
  response.set('Set-Cookie', sessionCookie(token, maxAge, production))
  response.json({ user: { name: 'Administrador', role: 'admin' } })
})

app.post('/api/logout', (_request, response) => {
  response.set('Set-Cookie', expiredSessionCookie(production))
  response.status(204).end()
})

app.get('/api/admin/students', requireAdmin, async (_request, response, next) => {
  try {
    response.json({ students: await store.list() })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/login-events', requireAdmin, async (request, response, next) => {
  try {
    response.json({ events: await loginEvents.list(request.query.limit) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/students', requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json({ student: await store.create(request.body ?? {}) })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/students/:id', requireAdmin, async (request, response, next) => {
  try {
    response.json({ student: await store.update(request.params.id, request.body ?? {}) })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/students/:id', requireAdmin, async (request, response, next) => {
  try {
    await store.remove(request.params.id)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.get('/api/game/access', requireStudent, (_request, response) => {
  response.json(gameDatabase.getAccess())
})

app.get('/api/game/state', requireStudent, (request, response, next) => {
  try {
    response.json(gameDatabase.getStudentState(request.session))
  } catch (error) {
    next(error)
  }
})

app.post('/api/game/teams', requireStudent, async (request, response, next) => {
  try {
    response.status(201).json(await gameDatabase.createTeam(request.session, request.body ?? {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/game/teams/join', requireStudent, async (request, response, next) => {
  try {
    response.json(await gameDatabase.joinTeam(request.session, request.body ?? {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/game/missions/:missionId/submit', requireStudent, async (request, response, next) => {
  try {
    response.json(await gameDatabase.submitMission(request.session, request.params.missionId, request.body ?? {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/game/missions/:missionId/hint', requireStudent, async (request, response, next) => {
  try {
    response.json(await gameDatabase.useHint(request.session, request.params.missionId))
  } catch (error) {
    next(error)
  }
})

app.post('/api/game/final', requireStudent, async (request, response, next) => {
  try {
    response.json(await gameDatabase.submitFinal(request.session, request.body ?? {}))
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/game', requireAdmin, (_request, response, next) => {
  try {
    response.json(gameDatabase.adminOverview())
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/game/access', requireAdmin, async (request, response, next) => {
  try {
    response.json(await gameDatabase.setEnabled(request.body?.enabled))
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/game/sessions', requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await gameDatabase.newSession(request.body?.title))
  } catch (error) {
    next(error)
  }
})

app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y' }))
app.use(express.static(distDir, { index: false, maxAge: '1h' }))
app.use((_request, response) => response.set('Cache-Control', 'no-cache').sendFile(path.join(distDir, 'index.html')))

app.use((error, _request, response, _next) => {
  console.error(JSON.stringify({ severity: 'ERROR', message: error.message, code: error.code }))
  response.status(Number(error.status) || 500).json({ error: Number(error.status) < 500 ? error.message : 'Não foi possível concluir a operação.' })
})

const server = app.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ severity: 'INFO', message: `Servidor iniciado na porta ${port}.` }))
})

let stopping = false
async function shutdown(signal) {
  if (stopping) return
  stopping = true
  console.log(JSON.stringify({ severity: 'INFO', message: `Encerramento recebido (${signal}); salvando o jogo.` }))
  server.close()
  const forced = setTimeout(() => process.exit(1), 9000)
  forced.unref()
  try {
    await gameDatabase.close()
    process.exit(0)
  } catch (error) {
    console.error(JSON.stringify({ severity: 'ERROR', message: 'Falha ao salvar o banco do jogo no encerramento.', code: error.code }))
    process.exit(1)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
