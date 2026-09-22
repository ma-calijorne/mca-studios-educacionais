import { CircleHelp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'

interface StudioScaffoldProps {
  eyebrow: string
  title: string
  description: string
  controls?: ReactNode
  stage: ReactNode
  inspector: ReactNode
  footer?: ReactNode
}

export function StudioScaffold({ eyebrow, title, description, controls, stage, inspector, footer }: StudioScaffoldProps) {
  const { topicId = 'relations', mode = 'learn' } = useParams()
  return (
    <div className="studio">
      <header className="studio__header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="studio__controls">
          <Link className="button button--ghost studio__howto-link" to={`/${topicId}/how-to?from=${mode}`}><CircleHelp size={16} /> Como usar</Link>
          {controls}
        </div>
      </header>
      <div className="studio__workspace">
        <main className="studio__stage">{stage}</main>
        <aside className="studio__inspector" aria-label="Painel de investigação">{inspector}</aside>
      </div>
      {footer && <footer className="studio__footer">{footer}</footer>}
    </div>
  )
}
