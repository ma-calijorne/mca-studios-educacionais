import { describe, expect, it } from 'vitest'
import { StudentStore, normalizeRa, validateRa } from './student-store.mjs'

class MemoryRepository {
  constructor() {
    this.document = { version: 1, updatedAt: null, students: [] }
    this.generation = 0
  }

  async read() {
    return { document: structuredClone(this.document), generation: String(this.generation) }
  }

  async write(document, generation) {
    if (Number(generation) !== this.generation) {
      const error = new Error('conflict')
      error.code = 412
      throw error
    }
    this.document = structuredClone(document)
    this.generation += 1
  }
}

describe('student store', () => {
  it('normalizes RAs without removing leading zeroes', () => {
    expect(normalizeRa(' 00ab-1 ')).toBe('00AB-1')
    expect(validateRa('001234')).toBe(true)
  })

  it('creates, finds and deactivates students', async () => {
    const store = new StudentStore(new MemoryRepository())
    const student = await store.create({ name: '  Ada   Lovelace ', ra: '00123', active: true })
    expect(await store.findActiveByRa('00123')).toMatchObject({ name: 'Ada Lovelace' })
    await store.update(student.id, { active: false })
    expect(await store.findActiveByRa('00123')).toBeNull()
  })

  it('does not allow duplicate RAs', async () => {
    const store = new StudentStore(new MemoryRepository())
    await store.create({ name: 'Ada', ra: '12345' })
    await expect(store.create({ name: 'Grace', ra: '12345' })).rejects.toMatchObject({ code: 'RA_EXISTS' })
  })
})
