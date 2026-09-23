import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createLoginEventStore, LoginEventStore } from './login-event-store.mjs'

class MemoryRepository {
  constructor() {
    this.events = []
  }

  async write(event) {
    this.events.push(structuredClone(event))
  }

  async list(limit) {
    return [...this.events].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt)).slice(0, limit)
  }
}

describe('login event store', () => {
  it('records the student identity and the login timestamp', async () => {
    const store = new LoginEventStore(new MemoryRepository())
    const event = await store.record(
      { id: 'student-1', name: 'Ada Lovelace', ra: '00123' },
      new Date('2026-09-23T18:45:30.000Z'),
    )

    expect(event).toMatchObject({
      schemaVersion: 1,
      studentId: 'student-1',
      name: 'Ada Lovelace',
      ra: '00123',
      loggedAt: '2026-09-23T18:45:30.000Z',
    })
    expect(event.id).toBeTruthy()
  })

  it('lists the most recent events first and applies the limit', async () => {
    const repository = new MemoryRepository()
    const store = new LoginEventStore(repository)
    await store.record({ id: 'student-1', name: 'Ada', ra: '00123' }, new Date('2026-09-22T10:00:00.000Z'))
    await store.record({ id: 'student-2', name: 'Grace', ra: '00456' }, new Date('2026-09-23T10:00:00.000Z'))

    await expect(store.list(1)).resolves.toMatchObject([{ name: 'Grace', ra: '00456' }])
  })

  it('persists valid JSON when running locally', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'login-events-'))
    const file = path.join(directory, 'events.json')
    try {
      const store = createLoginEventStore({ localFile: file })
      await store.record({ id: 'student-1', name: 'Ada', ra: '00123' }, new Date('2026-09-23T10:00:00.000Z'))

      const document = JSON.parse(await readFile(file, 'utf8'))
      expect(document).toMatchObject({ version: 1, events: [{ name: 'Ada', ra: '00123' }] })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
