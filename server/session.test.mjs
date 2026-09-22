import { describe, expect, it } from 'vitest'
import { parseCookies, safeEqual, signSession, verifySession } from './session.mjs'

describe('signed sessions', () => {
  it('round-trips a valid session', () => {
    const token = signSession({ sub: 'student-1', name: 'Ada', role: 'student' }, 'secret', 60)
    expect(verifySession(token, 'secret')).toMatchObject({ sub: 'student-1', name: 'Ada', role: 'student' })
  })

  it('rejects a modified signature', () => {
    const token = signSession({ sub: 'student-1', role: 'student' }, 'secret', 60)
    expect(verifySession(`${token}x`, 'secret')).toBeNull()
  })

  it('compares administrative keys safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
  })
})

describe('cookies', () => {
  it('parses cookie values', () => {
    expect(parseCookies('one=1; mci_session=abc.def')).toEqual({ one: '1', mci_session: 'abc.def' })
  })
})
