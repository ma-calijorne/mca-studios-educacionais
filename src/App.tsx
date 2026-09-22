import { lazy, Suspense, useEffect, useState, type ComponentType, type CSSProperties } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { BookOpen, LogOut, Maximize2, MoonStar, PanelLeftClose, RotateCcw, ShieldCheck, UserRound } from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { modeLabels, topics, type Mode, type TopicId } from './core/types'
import { useLearningStore } from './core/store'
import { AdminPage } from './auth/AdminPage'
import { getSession, logout, type AuthUser } from './auth/api'
import { LoginScreen } from './auth/LoginScreen'
import { HowToPage } from './components/HowToPage'

const SetsStudio = lazy(() => import('./studios/SetsStudio').then((module) => ({ default: module.SetsStudio })))
const RelationsStudio = lazy(() => import('./studios/RelationsStudio').then((module) => ({ default: module.RelationsStudio })))
const FunctionsStudio = lazy(() => import('./studios/FunctionsStudio').then((module) => ({ default: module.FunctionsStudio })))
const LogicStudio = lazy(() => import('./studios/LogicStudio').then((module) => ({ default: module.LogicStudio })))
const TruthTablesStudio = lazy(() => import('./studios/TruthTablesStudio').then((module) => ({ default: module.TruthTablesStudio })))
const EquivalencesStudio = lazy(() => import('./studios/EquivalencesStudio').then((module) => ({ default: module.EquivalencesStudio })))
const AlgorithmsStudio = lazy(() => import('./studios/AlgorithmsStudio').then((module) => ({ default: module.AlgorithmsStudio })))
const DigitalCircuitsStudio = lazy(() => import('./studios/DigitalCircuitsStudio').then((module) => ({ default: module.DigitalCircuitsStudio })))
const CountingStudio = lazy(() => import('./studios/CountingStudio').then((module) => ({ default: module.CountingStudio })))

const modes = Object.keys(modeLabels) as Mode[]

const studios: Record<TopicId, ComponentType<{ mode: Mode }>> = {
  sets: SetsStudio,
  relations: RelationsStudio,
  functions: FunctionsStudio,
  logic: LogicStudio,
  'truth-tables': TruthTablesStudio,
  equivalences: EquivalencesStudio,
  'logic-algorithms': AlgorithmsStudio,
  'digital-circuits': DigitalCircuitsStudio,
  counting: CountingStudio,
}

function TopicPage() {
  const { topicId = 'relations', mode = 'learn' } = useParams()
  const validTopic = topics.some((topic) => topic.id === topicId)
  const validMode = modes.includes(mode as Mode)
  if (!validTopic || !validMode) return <Navigate to="/relations/learn" replace />
  const Studio = studios[topicId as TopicId]
  return <Suspense fallback={<div className="studio-loading">Preparando laboratório…</div>}><Studio key={`${topicId}-${mode}`} mode={mode as Mode} /></Suspense>
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>()
  const projector = useLearningStore((state) => state.projector)
  const toggleProjector = useLearningStore((state) => state.toggleProjector)
  const completed = useLearningStore((state) => state.completed)
  const [, topicId = 'relations', pathMode = 'learn'] = location.pathname.split('/')
  const mode = modes.includes(pathMode as Mode) ? pathMode as Mode : 'learn'
  const isHowTo = pathMode === 'how-to'

  useEffect(() => {
    document.documentElement.dataset.projector = String(projector)
  }, [projector])

  useEffect(() => {
    let active = true
    void getSession()
      .then((session) => { if (active) setUser(session.authenticated && session.user ? session.user : null) })
      .catch(() => { if (active) setUser(null) })
    return () => { active = false }
  }, [])

  async function handleLogout() {
    await logout().catch(() => undefined)
    setUser(null)
    navigate('/', { replace: true })
  }

  if (user === undefined) {
    return <main className="session-loading"><div className="brand__mark" aria-hidden="true"><span /><span /><span /></div><span>Preparando seu laboratório…</span></main>
  }

  if (location.pathname.startsWith('/admin')) {
    return user?.role === 'admin'
      ? <AdminPage onLogout={handleLogout} />
      : <LoginScreen admin onAuthenticated={setUser} />
  }

  if (!user) return <LoginScreen onAuthenticated={setUser} />

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className={`app-shell${projector ? ' is-projector' : ''}`}>
        <header className="topbar">
          <div className="brand">
            <div className="brand__mark" aria-hidden="true"><span /><span /><span /></div>
            <div><strong>Matemática Computacional</strong><span>Laboratório interativo</span></div>
          </div>
          <div className="topbar__actions">
            <div className="progress-pill"><BookOpen size={15} /><span>{completed.length} descobertas registradas</span></div>
            {user.role === 'admin' && <button className="icon-button" onClick={() => navigate('/admin')} aria-label="Administrar alunos"><ShieldCheck size={18} /></button>}
            <Tooltip.Root>
              <Tooltip.Trigger asChild><button className="icon-button" onClick={toggleProjector} aria-label="Alternar modo projetor"><Maximize2 size={18} /></button></Tooltip.Trigger>
              <Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={8}>Modo projetor<Tooltip.Arrow className="tooltip__arrow" /></Tooltip.Content></Tooltip.Portal>
            </Tooltip.Root>
            <button className="icon-button" aria-label="Tema visual"><MoonStar size={18} /></button>
            <div className="user-pill"><UserRound size={15} /><span><strong>{user.name}</strong>{user.ra && <small>RA {user.ra}</small>}</span></div>
            <button className="icon-button" onClick={() => void handleLogout()} aria-label="Sair"><LogOut size={18} /></button>
          </div>
        </header>

        <aside className="topic-nav" aria-label="Assuntos">
          <div className="topic-nav__label"><span>ASSUNTOS</span><PanelLeftClose size={15} /></div>
          <nav>
            {topics.map((topic) => (
              <NavLink key={topic.id} to={`/${topic.id}/${mode}`} className={({ isActive }) => `topic-link${isActive ? ' is-active' : ''}`}>
                <span className="topic-link__icon" style={{ '--topic-accent': topic.accent } as CSSProperties}>{topic.icon}</span>
                <span><strong>{topic.shortTitle}</strong><small>{topic.description}</small></span>
              </NavLink>
            ))}
          </nav>
          <button className="topic-nav__reset" onClick={() => useLearningStore.getState().clearProgress()}><RotateCcw size={14} /> Limpar progresso local</button>
        </aside>

        <div className="modebar">
          <div className="modebar__topic">{topics.find((topic) => topic.id === topicId)?.title ?? 'Estúdio'}</div>
          <nav aria-label="Modos de aprendizagem">
            {modes.map((item) => (
              <button key={item} className={!isHowTo && mode === item ? 'is-active' : ''} onClick={() => navigate(`/${topicId}/${item}`)}>{modeLabels[item]}</button>
            ))}
          </nav>
        </div>

        <div className="app-content">
          <Routes>
            <Route path="/:topicId/how-to" element={<HowToPage />} />
            <Route path="/:topicId/:mode" element={<TopicPage />} />
            <Route path="*" element={<Navigate to="/relations/learn" replace />} />
          </Routes>
        </div>
      </div>
    </Tooltip.Provider>
  )
}

export default App
