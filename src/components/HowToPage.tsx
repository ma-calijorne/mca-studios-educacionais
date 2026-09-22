import { ArrowLeft, BookOpenCheck, CheckCircle2, Compass, Lightbulb, MousePointerClick } from 'lucide-react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { howToGuides } from '../core/howTo'
import { modeLabels, topics, type Mode, type TopicId } from '../core/types'

const modes = Object.keys(modeLabels) as Mode[]

export function HowToPage() {
  const { topicId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const topic = topics.find((item) => item.id === topicId)
  const guide = howToGuides[topicId as TopicId]
  const from = searchParams.get('from')
  const returnMode: Mode = modes.includes(from as Mode) ? from as Mode : 'learn'

  if (!topic || !guide) return <Navigate to="/relations/learn" replace />

  return (
    <main className="howto-page">
      <header className="howto-hero" style={{ '--howto-accent': topic.accent } as CSSProperties}>
        <div>
          <div className="eyebrow"><BookOpenCheck size={15} /> Guia do estúdio</div>
          <h1>{guide.headline}</h1>
          <p>{guide.summary}</p>
        </div>
        <Link className="button button--ghost" to={`/${topic.id}/${returnMode}`}><ArrowLeft size={16} /> Voltar ao estúdio</Link>
      </header>

      <div className="howto-layout">
        <section className="howto-main">
          <article className="howto-goal">
            <span><Compass size={20} /></span>
            <div><small>OBJETIVO</small><strong>{guide.goal}</strong></div>
          </article>

          <section className="howto-section" aria-labelledby="howto-steps-title">
            <div className="howto-section__heading"><MousePointerClick size={18} /><div><span>FLUXO RECOMENDADO</span><h2 id="howto-steps-title">Como usar</h2></div></div>
            <ol className="howto-steps">
              {guide.steps.map((step, index) => (
                <li key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.description}</p></div></li>
              ))}
            </ol>
          </section>
        </section>

        <aside className="howto-side">
          <section className="howto-section">
            <div className="howto-section__heading"><BookOpenCheck size={18} /><div><span>QUATRO EXPERIÊNCIAS</span><h2>Modos de aprendizagem</h2></div></div>
            <div className="howto-modes">
              {modes.map((mode) => <div key={mode}><strong>{modeLabels[mode]}</strong><p>{guide.modes[mode]}</p></div>)}
            </div>
          </section>
          <section className="howto-section howto-tips">
            <div className="howto-section__heading"><Lightbulb size={18} /><div><span>PARA APROVEITAR MELHOR</span><h2>Dicas rápidas</h2></div></div>
            <ul>{guide.tips.map((tip) => <li key={tip}><CheckCircle2 size={16} /><span>{tip}</span></li>)}</ul>
          </section>
        </aside>
      </div>
    </main>
  )
}
