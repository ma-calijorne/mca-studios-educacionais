import { Check, ChevronRight, CircleMinus, X } from 'lucide-react'
import type { AnalysisResult } from '../core/types'

interface AnalysisCardProps {
  result: AnalysisResult
  active?: boolean
  hidden?: boolean
  onClick?: () => void
}

export function AnalysisCard({ result, active, hidden, onClick }: AnalysisCardProps) {
  const status = hidden ? 'pending' : result.value === null ? 'na' : result.value ? 'true' : 'false'
  const Icon = status === 'true' ? Check : status === 'false' ? X : CircleMinus
  return (
    <button
      className={`analysis-card analysis-card--${status}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="analysis-card__icon" aria-hidden="true"><Icon size={15} /></span>
      <span className="analysis-card__label">{result.label}</span>
      <strong>{hidden ? 'PREVER' : result.value === null ? '—' : result.value ? 'SIM' : 'NÃO'}</strong>
      <ChevronRight size={15} aria-hidden="true" />
    </button>
  )
}
