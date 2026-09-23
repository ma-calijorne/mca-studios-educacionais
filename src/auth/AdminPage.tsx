import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Clock3, LogOut, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createStudent, deleteStudent, listLoginEvents, listStudents, updateStudent, type LoginEvent, type Student } from './api'

interface AdminPageProps {
  onLogout: () => Promise<void>
}

const emptyForm = { name: '', ra: '', active: true }
const accessDateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' })
const accessTimeFormatter = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium', timeZone: 'America/Sao_Paulo' })

export function AdminPage({ onLogout }: AdminPageProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [eventsError, setEventsError] = useState('')

  async function refreshStudents() {
    setLoading(true)
    try {
      const result = await listStudents()
      setStudents(result.students)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os alunos.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshLoginEvents() {
    setEventsLoading(true)
    try {
      const result = await listLoginEvents(100)
      setLoginEvents(result.events)
      setEventsError('')
    } catch (caught) {
      setEventsError(caught instanceof Error ? caught.message : 'Não foi possível carregar o histórico de acessos.')
    } finally {
      setEventsLoading(false)
    }
  }

  useEffect(() => {
    void refreshStudents()
    void refreshLoginEvents()
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return students
    return students.filter((student) => student.name.toLocaleLowerCase('pt-BR').includes(normalized) || student.ra.toLocaleLowerCase('pt-BR').includes(normalized))
  }, [query, students])

  function startEditing(student: Student) {
    setEditing(student.id)
    setForm({ name: student.name, ra: student.ra, active: student.active })
    setError('')
  }

  function resetForm() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) await updateStudent(editing, form)
      else await createStudent(form)
      resetForm()
      await refreshStudents()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o aluno.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(student: Student) {
    setError('')
    try {
      await updateStudent(student.id, { active: !student.active })
      await refreshStudents()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar o acesso.')
    }
  }

  async function remove(student: Student) {
    if (!window.confirm(`Remover ${student.name} (${student.ra})?`)) return
    setError('')
    try {
      await deleteStudent(student.id)
      if (editing === student.id) resetForm()
      await refreshStudents()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível remover o aluno.')
    }
  }

  const activeCount = students.filter((student) => student.active).length

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="auth-brand">
          <div className="brand__mark" aria-hidden="true"><span /><span /><span /></div>
          <div><strong>Matemática Computacional</strong><span>Administração de alunos</span></div>
        </div>
        <div className="admin-topbar__actions">
          <Link className="button button--ghost" to="/relations/learn"><ArrowLeft size={15} /> Ver laboratórios</Link>
          <button className="button button--ghost" onClick={() => void onLogout()}><LogOut size={15} /> Sair</button>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-heading">
          <div>
            <span className="eyebrow"><ShieldCheck size={14} /> ÁREA DO PROFESSOR</span>
            <h1>Alunos e acessos</h1>
            <p>Cadastre a turma, corrija dados e libere ou suspenda o acesso por RA.</p>
          </div>
          <div className="admin-stats">
            <div><Users size={20} /><span><strong>{students.length}</strong> cadastrados</span></div>
            <div><Check size={20} /><span><strong>{activeCount}</strong> ativos</span></div>
            <div><Clock3 size={20} /><span><strong>{loginEvents.length}</strong> acessos recentes</span></div>
          </div>
        </section>

        {error && <div className="admin-alert" role="alert">{error}</div>}

        <section className="admin-grid">
          <form className="admin-form-card" onSubmit={handleSave}>
            <div className="admin-card-title">
              <div><Plus size={17} /></div>
              <span><strong>{editing ? 'Editar aluno' : 'Novo aluno'}</strong><small>{editing ? 'Atualize os dados selecionados.' : 'Adicione uma RA à turma.'}</small></span>
            </div>
            <label><span>Nome completo</span><input maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome do aluno" required value={form.name} /></label>
            <label><span>RA</span><input maxLength={32} onChange={(event) => setForm({ ...form, ra: event.target.value.toUpperCase() })} placeholder="Ex.: 2026001234" required value={form.ra} /></label>
            <label className="admin-checkbox"><input checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} type="checkbox" /><span>RA ativa para acesso</span></label>
            <div className="admin-form-actions">
              {editing && <button className="button button--ghost" onClick={resetForm} type="button"><X size={15} /> Cancelar</button>}
              <button className="button button--primary" disabled={saving} type="submit">{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar aluno'}</button>
            </div>
          </form>

          <section className="admin-list-card">
            <div className="admin-list-toolbar">
              <div><strong>Alunos cadastrados</strong><span>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</span></div>
              <label className="admin-search"><Search size={16} /><input aria-label="Buscar aluno" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome ou RA" value={query} /></label>
            </div>

            {loading ? <div className="admin-empty">Carregando alunos…</div> : filtered.length === 0 ? (
              <div className="admin-empty"><Users size={34} /><strong>{students.length ? 'Nenhum aluno encontrado' : 'Sua turma ainda está vazia'}</strong><span>{students.length ? 'Tente outro termo de busca.' : 'Use o formulário ao lado para fazer o primeiro cadastro.'}</span></div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Aluno</th><th>RA</th><th>Acesso</th><th><span className="sr-only">Ações</span></th></tr></thead>
                  <tbody>{filtered.map((student) => (
                    <tr key={student.id}>
                      <td><span className="student-avatar">{student.name.slice(0, 1).toUpperCase()}</span><strong>{student.name}</strong></td>
                      <td><code>{student.ra}</code></td>
                      <td><button className={`status-toggle ${student.active ? 'is-active' : 'is-inactive'}`} onClick={() => void toggleActive(student)}><span />{student.active ? 'Ativa' : 'Inativa'}</button></td>
                      <td><div className="table-actions"><button aria-label={`Editar ${student.name}`} onClick={() => startEditing(student)}><Pencil size={15} /></button><button aria-label={`Remover ${student.name}`} className="is-danger" onClick={() => void remove(student)}><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </section>

        <section className="admin-list-card admin-access-card">
          <div className="admin-list-toolbar">
            <div><strong>Acessos recentes</strong><span>Últimos 100 logins · horário de Brasília</span></div>
            <button className="button button--ghost admin-refresh" disabled={eventsLoading} onClick={() => void refreshLoginEvents()} type="button">
              <RefreshCw className={eventsLoading ? 'is-spinning' : ''} size={15} /> Atualizar
            </button>
          </div>

          {eventsError ? <div className="admin-access-error" role="alert">{eventsError}</div> : eventsLoading ? (
            <div className="admin-empty admin-access-empty">Carregando acessos…</div>
          ) : loginEvents.length === 0 ? (
            <div className="admin-empty admin-access-empty"><Clock3 size={34} /><strong>Nenhum acesso registrado</strong><span>Os logins dos alunos aparecerão aqui.</span></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-access-table">
                <thead><tr><th>Aluno</th><th>RA</th><th>Data</th><th>Hora</th></tr></thead>
                <tbody>{loginEvents.map((event) => {
                  const loggedAt = new Date(event.loggedAt)
                  return (
                    <tr key={event.id}>
                      <td><span className="student-avatar">{event.name.slice(0, 1).toUpperCase()}</span><strong>{event.name}</strong></td>
                      <td><code>{event.ra}</code></td>
                      <td><time dateTime={event.loggedAt}>{accessDateFormatter.format(loggedAt)}</time></td>
                      <td><time dateTime={event.loggedAt}>{accessTimeFormatter.format(loggedAt)}</time></td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
