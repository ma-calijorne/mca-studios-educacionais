import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EMPTY_DOCUMENT = Object.freeze({ version: 1, events: [] })

function storeError(message, code, status) {
  const error = new Error(message)
  error.code = code
  error.status = status
  return error
}

function validateEvent(value) {
  if (!value || value.schemaVersion !== 1 || !value.id || !value.studentId || !value.name || !value.ra || !value.loggedAt) {
    throw storeError('O registro de acesso possui formato inválido.', 'INVALID_LOGIN_EVENT', 500)
  }
  return value
}

function validateDocument(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.events)) {
    throw storeError('O arquivo de acessos possui formato inválido.', 'INVALID_LOGIN_EVENTS_DOCUMENT', 500)
  }
  return value
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 100
}

function sortNewestFirst(events) {
  return events.sort((left, right) => right.loggedAt.localeCompare(left.loggedAt) || right.id.localeCompare(left.id))
}

class CloudRunAccessToken {
  constructor() {
    this.value = ''
    this.expiresAt = 0
  }

  async get(forceRefresh = false) {
    if (!forceRefresh && this.value && Date.now() < this.expiresAt) return this.value
    const response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
    })
    if (!response.ok) throw storeError('Não foi possível autenticar no Cloud Storage.', 'STORAGE_AUTH', 503)
    const token = await response.json()
    this.value = token.access_token
    this.expiresAt = Date.now() + Math.max(60, Number(token.expires_in) - 120) * 1000
    return this.value
  }
}

class GcsLoginEventRepository {
  constructor(bucketName, prefix, accessToken = new CloudRunAccessToken()) {
    this.bucketName = bucketName
    this.prefix = prefix.replace(/^\/+|\/+$/g, '') || 'login-events'
    this.accessToken = accessToken
  }

  async request(url, options = {}, retry = true) {
    const token = await this.accessToken.get(!retry)
    const response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
    if (response.status === 401 && retry) return this.request(url, options, false)
    return response
  }

  async assertOk(response) {
    if (response.ok) return response
    throw storeError('Não foi possível acessar o histórico de logins.', 'LOGIN_STORAGE_REQUEST', response.status >= 500 ? 503 : 500)
  }

  objectName(event) {
    const day = event.loggedAt.slice(0, 10).replaceAll('-', '/')
    const timestamp = event.loggedAt.replace(/[:.]/g, '-')
    return `${this.prefix}/${day}/${timestamp}-${event.id}.json`
  }

  async write(event) {
    const query = new URLSearchParams({
      uploadType: 'media',
      name: this.objectName(event),
      ifGenerationMatch: '0',
    })
    const response = await this.request(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucketName)}/o?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: `${JSON.stringify(event, null, 2)}\n`,
    })
    await this.assertOk(response)
  }

  async objectNames() {
    const names = []
    let pageToken = ''
    do {
      const query = new URLSearchParams({ prefix: `${this.prefix}/`, maxResults: '1000', fields: 'items(name),nextPageToken' })
      if (pageToken) query.set('pageToken', pageToken)
      const response = await this.request(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucketName)}/o?${query}`)
      await this.assertOk(response)
      const page = await response.json()
      names.push(...(page.items ?? []).map((item) => item.name).filter((name) => name.endsWith('.json')))
      pageToken = page.nextPageToken ?? ''
    } while (pageToken)
    return names.sort().reverse()
  }

  async readObject(name) {
    const query = new URLSearchParams({ alt: 'media' })
    const response = await this.request(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(name)}?${query}`)
    await this.assertOk(response)
    return validateEvent(await response.json())
  }

  async list(limit) {
    const names = (await this.objectNames()).slice(0, normalizeLimit(limit))
    const events = await Promise.all(names.map((name) => this.readObject(name)))
    return sortNewestFirst(events)
  }
}

class LocalLoginEventRepository {
  constructor(filePath) {
    this.filePath = filePath
    this.pendingWrite = Promise.resolve()
  }

  async readDocument() {
    try {
      return validateDocument(JSON.parse(await readFile(this.filePath, 'utf8')))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return structuredClone(EMPTY_DOCUMENT)
    }
  }

  async write(event) {
    this.pendingWrite = this.pendingWrite.then(async () => {
      const document = await this.readDocument()
      document.events = sortNewestFirst([...document.events, event]).slice(0, 2000)
      await mkdir(path.dirname(this.filePath), { recursive: true })
      const temporary = `${this.filePath}.${process.pid}.tmp`
      await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
      await rename(temporary, this.filePath)
    })
    return this.pendingWrite
  }

  async list(limit) {
    await this.pendingWrite
    const document = await this.readDocument()
    return sortNewestFirst([...document.events]).slice(0, normalizeLimit(limit))
  }
}

export class LoginEventStore {
  constructor(repository) {
    this.repository = repository
  }

  async record(student, at = new Date()) {
    const event = {
      schemaVersion: 1,
      id: randomUUID(),
      studentId: student.id,
      name: student.name,
      ra: student.ra,
      loggedAt: at.toISOString(),
    }
    validateEvent(event)
    await this.repository.write(event)
    return event
  }

  async list(limit = 100) {
    return this.repository.list(normalizeLimit(limit))
  }
}

export function createLoginEventStore({ bucketName, prefix = 'login-events', localFile, accessToken } = {}) {
  const repository = bucketName
    ? new GcsLoginEventRepository(bucketName, prefix, accessToken)
    : new LocalLoginEventRepository(localFile ?? path.resolve('server/data/login-events.local.json'))
  return new LoginEventStore(repository)
}
