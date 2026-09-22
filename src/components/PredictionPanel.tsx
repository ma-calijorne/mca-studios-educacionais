import { useState } from 'react'
import { Lightbulb, LockKeyhole } from 'lucide-react'

interface PredictionPanelProps {
  question: string
  onSubmit: (value: boolean) => void
  yesLabel?: string
  noLabel?: string
}

export function PredictionPanel({ question, onSubmit, yesLabel = 'Sim', noLabel = 'Não' }: PredictionPanelProps) {
  const [choice, setChoice] = useState<boolean | null>(null)
  return (
    <section className="prediction-panel" aria-labelledby="prediction-title">
      <div className="eyebrow"><Lightbulb size={15} /> Antes de analisar</div>
      <h3 id="prediction-title">{question}</h3>
      <p>Sua previsão ficará registrada para compararmos com o resultado.</p>
      <div className="segmented-control" role="group" aria-label="Escolha sua previsão">
        <button className={choice === true ? 'selected' : ''} onClick={() => setChoice(true)}>{yesLabel}</button>
        <button className={choice === false ? 'selected' : ''} onClick={() => setChoice(false)}>{noLabel}</button>
      </div>
      <button className="button button--primary button--wide" disabled={choice === null} onClick={() => choice !== null && onSubmit(choice)}>
        <LockKeyhole size={16} /> Registrar e analisar
      </button>
    </section>
  )
}
