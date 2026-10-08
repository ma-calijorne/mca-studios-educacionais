import { describe, expect, it } from 'vitest'
import { validateFinalKey, validateMissionAnswer } from './game-content.mjs'

describe('conteúdo do Último Axioma', () => {
  it('valida os sete selos sem expor aproximações incorretas', () => {
    expect(validateMissionAnswer('arquivo-vazio', { elements: [12, 2, 3, 11, 5, 7], cardinality: 6 }).correct).toBe(true)
    expect(validateMissionAnswer('corredor-vinculos', { properties: ['reflexiva', 'antissimetrica'], missingPair: '(A,C)' }).correct).toBe(true)
    expect(validateMissionAnswer('galeria-espelhos', { classification: 'não injetiva e não sobrejetiva', repair: 'Orfeu→Oeste' }).correct).toBe(true)
    expect(validateMissionAnswer('capela-vozes', { conclusion: '¬p', formulaClass: 'tautologia', equivalence: '¬p∨q' }).correct).toBe(true)
    expect(validateMissionAnswer('automato-cego', { predicate: '(selo&&operador)||(emergencia&&guardiao)', outputs: '1010' }).correct).toBe(true)
    expect(validateMissionAnswer('lampadas-mortas', { expression: 'L = (A XOR B) AND NOT I', activeRows: ['100', '010'] }).correct).toBe(true)
    expect(validateMissionAnswer('labirinto-possibilidades', { additive: 5, multiplicative: 12, combination: 35, constrained: 300, total: 352 }).correct).toBe(true)
  })

  it('valida somente a chave final completa', () => {
    expect(validateFinalKey('PARADOX-128-1')).toBe(true)
    expect(validateFinalKey('PARADOX-128')).toBe(false)
  })
})
