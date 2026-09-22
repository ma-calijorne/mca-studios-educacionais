import katex from 'katex'

interface MathExpressionProps {
  value: string
  label?: string
  block?: boolean
}

export function MathExpression({ value, label, block = false }: MathExpressionProps) {
  const html = katex.renderToString(value, {
    throwOnError: false,
    output: 'htmlAndMathml',
    displayMode: block,
  })
  return (
    <span
      className={block ? 'math-expression math-expression--block' : 'math-expression'}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
