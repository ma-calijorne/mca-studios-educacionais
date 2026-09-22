import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, KeyRound, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { loginAdmin, loginStudent, type AuthUser } from './api'

interface LoginScreenProps {
  admin?: boolean
  onAuthenticated: (user: AuthUser) => void
}

export function LoginScreen({ admin = false, onAuthenticated }: LoginScreenProps) {
  const [credential, setCredential] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { user } = admin ? await loginAdmin(credential.trim()) : await loginStudent(credential)
      onAuthenticated(user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Apresentação">
        <div className="auth-brand">
          <div className="brand__mark" aria-hidden="true"><span /><span /><span /></div>
          <div><strong>Matemática Computacional</strong><span>Laboratório interativo</span></div>
        </div>
        <div className="auth-story__content">
          <span className="auth-kicker">NOVE ESTÚDIOS · UMA EXPERIÊNCIA</span>
          <h1>Experimente, formule uma hipótese e deixe a matemática responder.</h1>
          <p>Conjuntos, relações, funções, lógica e circuitos em ambientes feitos para investigar — não apenas memorizar.</p>
          <div className="auth-topics" aria-hidden="true">
            <span>∪</span><span>↔</span><span>ƒ</span><span>∧</span><span>⊤</span><span>≡</span><span>{'{}'}</span><span>⏻</span><span>#</span>
          </div>
        </div>
        <small>Seu progresso permanece salvo neste dispositivo.</small>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className={`auth-card__icon${admin ? ' is-admin' : ''}`}>
            {admin ? <ShieldCheck size={25} /> : <BookOpen size={25} />}
          </div>
          <span className="eyebrow">{admin ? 'ÁREA RESTRITA' : 'IDENTIFICAÇÃO DO ALUNO'}</span>
          <h2>{admin ? 'Administração da turma' : 'Vamos começar?'}</h2>
          <p>{admin ? 'Informe a chave administrativa para gerenciar os alunos.' : 'Digite sua RA para entrar no laboratório.'}</p>

          <label className="auth-field">
            <span>{admin ? 'Chave administrativa' : 'Registro Acadêmico (RA)'}</span>
            <div>
              {admin ? <KeyRound size={18} /> : <span aria-hidden="true">RA</span>}
              <input
                autoFocus
                autoComplete={admin ? 'current-password' : 'username'}
                inputMode={admin ? 'text' : 'numeric'}
                maxLength={admin ? 24 : 32}
                onChange={(event) => setCredential(admin ? event.target.value : event.target.value.toUpperCase())}
                placeholder={admin ? 'Cole sua chave' : 'Ex.: 2026001234'}
                type={admin ? 'password' : 'text'}
                value={credential}
              />
            </div>
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="button button--primary auth-submit" disabled={submitting || credential.trim().length < 3} type="submit">
            {submitting ? 'Verificando…' : admin ? 'Entrar na administração' : 'Entrar no laboratório'}
            {!submitting && <ArrowRight size={17} />}
          </button>

          {admin ? (
            <Link className="auth-alternate" to="/"><ArrowLeft size={15} /> Voltar ao acesso dos alunos</Link>
          ) : (
            <Link className="auth-alternate" to="/admin">Acesso do professor</Link>
          )}
        </form>
        <p className="auth-help">Em caso de dificuldade com sua RA, procure o professor.</p>
      </section>
    </main>
  )
}
