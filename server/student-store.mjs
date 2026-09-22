import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EMPTY_DOCUMENT = Object.freeze({ version: 1, updatedAt: null, students: [] })

export function normalizeRa(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function validateRa(value) {
  return /^[A-Z0-9.-]{3,32}$/.test(normalizeRa(value))
}

export function normalizeStudent(input, existing = {}) {
  const name = String(input.name ?? existing.name ?? '').trim().replace(/\s+/g, ' ')
  const ra = normalizeRa(input.ra ?? existing.ra)
  if (name.length < 2 || name.length > 120) throw storeError('Nome deve ter entre 2 e 120 caracteres.', 'INVALID_NAME', 400)
  if (!validateRa(ra)) throw storeError('RA deve ter de 3 a 32 caracteres: letras, números, ponto ou hífen.', 'INVALID_RA', 400)
  return { name, ra, active: input.active === undefined ? (existing.active ?? true) : Boolean(input.active) }
}

function storeError(message, code, status) {
  const error = new Error(message)
  error.code = code
  error.status = status
  return error
}

function validateDocument(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.students)) {
    throw storeError('O arquivo de alunos possui formato inválido.', 'INVALID_DOCUMENT', 500)
  }
  return value
}

function sortStudents(students) {
  return students.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR') || left.ra.localeCompare(right.ra))
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

class GcsRepository {
  constructor(bucketName, objectName, accessToken = new CloudRunAccessToken()) {
    this.bucketName = bucketName
    this.objectName = objectName
    this.accessToken = accessToken
  }

  objectUrl(search = '') {
    return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(this.objectName)}${search}`
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
    const error = storeError('Não foi possível acessar o cadastro de alunos.', 'STORAGE_REQUEST', response.status >= 500 ? 503 : 500)
    error.code = response.status
    throw error
  }

  async read() {
    const metadataResponse = await this.request(this.objectUrl())
    if (metadataResponse.status === 404) return { document: structuredClone(EMPTY_DOCUMENT), generation: '0' }
    await this.assertOk(metadataResponse)
    const metadata = await metadataResponse.json()
    const generation = String(metadata.generation)
    const mediaResponse = await this.request(this.objectUrl(`?alt=media&generation=${encodeURIComponent(generation)}`))
    await this.assertOk(mediaResponse)
    return { document: validateDocument(await mediaResponse.json()), generation }
  }

  async write(document, generation) {
    const query = new URLSearchParams({
      uploadType: 'media',
      name: this.objectName,
      ifGenerationMatch: String(generation),
    })
    const response = await this.request(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucketName)}/o?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: `${JSON.stringify(document, null, 2)}\n`,
    })
    await this.assertOk(response)
  }
}

class LocalRepository {
  constructor(filePath) {
    this.filePath = filePath
    this.generation = 0
  }

  async read() {
    try {
      const contents = await readFile(this.filePath, 'utf8')
      return { document: validateDocument(JSON.parse(contents)), generation: String(this.generation) }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return { document: structuredClone(EMPTY_DOCUMENT), generation: String(this.generation) }
    }
  }

  async write(document, generation) {
    if (Number(generation) !== this.generation) throw storeError('Conflito de atualização.', 412, 412)
    await mkdir(path.dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.tmp`
    await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    await rename(temporary, this.filePath)
    this.generation += 1
  }
}

export class StudentStore {
  constructor(repository) {
    this.repository = repository
  }

  async list() {
    const { document } = await this.repository.read()
    return sortStudents([...document.students])
  }

  async findActiveByRa(ra) {
    const normalized = normalizeRa(ra)
    const students = await this.list()
    return students.find((student) => student.ra === normalized && student.active) ?? null
  }

  async mutate(mutator) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { document, generation } = await this.repository.read()
      const next = structuredClone(document)
      const result = mutator(next.students)
      next.students = sortStudents(next.students)
      next.updatedAt = new Date().toISOString()
      try {
        await this.repository.write(next, generation)
        return result
      } catch (error) {
        if (Number(error.code) !== 412 || attempt === 3) throw error
      }
    }
    throw storeError('Não foi possível concluir a atualização concorrente.', 'UPDATE_CONFLICT', 409)
  }

  async create(input) {
    const clean = normalizeStudent(input)
    const timestamp = new Date().toISOString()
    const student = { id: randomUUID(), ...clean, createdAt: timestamp, updatedAt: timestamp }
    return this.mutate((students) => {
      if (students.some((item) => item.ra === student.ra)) throw storeError('Já existe um aluno com esta RA.', 'RA_EXISTS', 409)
      students.push(student)
      return student
    })
  }

  async update(id, input) {
    return this.mutate((students) => {
      const index = students.findIndex((student) => student.id === id)
      if (index < 0) throw storeError('Aluno não encontrado.', 'NOT_FOUND', 404)
      const clean = normalizeStudent(input, students[index])
      if (students.some((student, candidate) => candidate !== index && student.ra === clean.ra)) {
        throw storeError('Já existe um aluno com esta RA.', 'RA_EXISTS', 409)
      }
      students[index] = { ...students[index], ...clean, updatedAt: new Date().toISOString() }
      return students[index]
    })
  }

  async remove(id) {
    return this.mutate((students) => {
      const index = students.findIndex((student) => student.id === id)
      if (index < 0) throw storeError('Aluno não encontrado.', 'NOT_FOUND', 404)
      const [removed] = students.splice(index, 1)
      return removed
    })
  }
}

export function createStudentStore({ bucketName, objectName = 'students.json', localFile, accessToken } = {}) {
  const repository = bucketName
    ? new GcsRepository(bucketName, objectName, accessToken)
    : new LocalRepository(localFile ?? path.resolve('server/data/students.local.json'))
  return new StudentStore(repository)
}
