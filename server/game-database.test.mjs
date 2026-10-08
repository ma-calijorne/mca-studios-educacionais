import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createGameDatabase } from './game-database.mjs'

const directories = []
const student = { sub: 'student-1', name: 'Ada', ra: 'RA001', role: 'student' }

async function database() {
  const directory = await mkdtemp(path.join(tmpdir(), 'mca-game-'))
  directories.push(directory)
  return createGameDatabase({ localFile: path.join(directory, 'game.sqlite') })
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('banco do Último Axioma', () => {
  it('mantém o jogo bloqueado até a liberação do professor', async () => {
    const db = await database()
    expect(db.getAccess().enabled).toBe(false)
    await expect(db.createTeam(student, { name: 'Equipe Lambda' })).rejects.toMatchObject({ code: 'GAME_LOCKED' })
    const access = await db.setEnabled(true)
    expect(access.enabled).toBe(true)
    expect(access.session).not.toBeNull()
    await db.close()
  })

  it('cria equipe e só avança com resposta e evidências corretas', async () => {
    const db = await database()
    await db.setEnabled(true)
    const created = await db.createTeam(student, { name: 'Equipe Lambda' })
    expect(created.team.code).toHaveLength(6)

    const evidence = { representation: 'Diagrama dos conjuntos', result: '{2,3,5,7,11,12}', test: 'Verificamos elemento por elemento', explanation: 'Unimos A e B e retiramos C' }
    const wrong = await db.submitMission(student, 'arquivo-vazio', { prediction: 'sete elementos', evidence, answer: { elements: [2, 3], cardinality: 2 } })
    expect(wrong.validation.correct).toBe(false)
    expect(wrong.state.team.currentStage).toBe(0)

    const right = await db.submitMission(student, 'arquivo-vazio', { prediction: 'seis elementos', evidence, answer: { elements: [2, 3, 5, 7, 11, 12], cardinality: 6 } })
    expect(right.validation.correct).toBe(true)
    expect(right.state.team.currentStage).toBe(1)
    expect(right.state.team.score).toBe(100)
    await db.close()
  })

  it('conclui os sete selos, a câmara final e restaura o SQLite', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mca-game-'))
    directories.push(directory)
    const file = path.join(directory, 'game.sqlite')
    const db = await createGameDatabase({ localFile: file })
    await db.setEnabled(true)
    await db.createTeam(student, { name: 'Equipe Turing' })
    const evidence = { representation: 'Representação completa', result: 'Resultado calculado', test: 'Caso crítico conferido', explanation: 'Regra aplicada ao resultado' }
    const submissions = [
      ['arquivo-vazio', { elements: [2, 3, 5, 7, 11, 12], cardinality: 6 }],
      ['corredor-vinculos', { properties: ['Reflexiva', 'Antissimétrica'], missingPair: '(A,C)' }],
      ['galeria-espelhos', { classification: 'Função não-injetiva e não-sobrejetiva', repair: 'Orfeu→Oeste' }],
      ['capela-vozes', { conclusion: '¬p', formulaClass: 'Tautologia', equivalence: '¬p∨q' }],
      ['automato-cego', { predicate: '(selo&&operador)||(emergencia&&guardiao)', outputs: '1010' }],
      ['lampadas-mortas', { expression: 'L = (A XOR B) AND NOT I', activeRows: ['010', '100'] }],
      ['labirinto-possibilidades', { additive: 5, multiplicative: 12, combination: 35, constrained: 300, total: 352 }],
    ]
    for (const [missionId, answer] of submissions) {
      const result = await db.submitMission(student, missionId, { prediction: 'Previsão documentada', evidence, answer })
      expect(result.validation.correct).toBe(true)
    }
    const final = await db.submitFinal(student, { key: 'PARADOX-128-1' })
    expect(final.correct).toBe(true)
    expect(final.state.team.score).toBe(900)
    await db.close()

    const restored = await createGameDatabase({ localFile: file })
    const state = restored.getStudentState(student)
    expect(state.team.currentStage).toBe(7)
    expect(state.team.completedAt).toBeTruthy()
    expect(state.missions.map((mission) => mission.seal).join('')).toBe('PARADOX')
    await restored.close()
  })
})
