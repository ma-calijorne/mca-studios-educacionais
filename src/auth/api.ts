export type AuthRole = 'student' | 'admin'

export interface AuthUser {
  name: string
  ra?: string
  role: AuthRole
}

export interface Student {
  id: string
  name: string
  ra: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginEvent {
  id: string
  studentId: string
  name: string
  ra: string
  loggedAt: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Não foi possível concluir a operação.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function getSession() {
  return request<{ authenticated: boolean; user?: AuthUser }>('/api/session')
}

export async function loginStudent(ra: string) {
  return request<{ user: AuthUser }>('/api/auth/student', { method: 'POST', body: JSON.stringify({ ra }) })
}

export async function loginAdmin(key: string) {
  return request<{ user: AuthUser }>('/api/auth/admin', { method: 'POST', body: JSON.stringify({ key }) })
}

export async function logout() {
  return request<void>('/api/logout', { method: 'POST' })
}

export async function listStudents() {
  return request<{ students: Student[] }>('/api/admin/students')
}

export async function listLoginEvents(limit = 100) {
  return request<{ events: LoginEvent[] }>(`/api/admin/login-events?limit=${encodeURIComponent(limit)}`)
}

export async function createStudent(input: Pick<Student, 'name' | 'ra' | 'active'>) {
  return request<{ student: Student }>('/api/admin/students', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateStudent(id: string, input: Partial<Pick<Student, 'name' | 'ra' | 'active'>>) {
  return request<{ student: Student }>(`/api/admin/students/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) })
}

export async function deleteStudent(id: string) {
  return request<void>(`/api/admin/students/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
