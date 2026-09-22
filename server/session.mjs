import { createHmac, timingSafeEqual } from 'node:crypto'

const encoder = new TextEncoder()

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function safeEqual(left, right) {
  const leftDigest = createHmac('sha256', 'comparison').update(String(left)).digest()
  const rightDigest = createHmac('sha256', 'comparison').update(String(right)).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

export function signSession(payload, secret, ttlSeconds) {
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  })).toString('base64url')

  return `${body}.${signature(body, secret)}`
}

export function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null
  const [body, suppliedSignature, extra] = token.split('.')
  if (!body || !suppliedSignature || extra) return null

  const expected = signature(body, secret)
  const suppliedBytes = encoder.encode(suppliedSignature)
  const expectedBytes = encoder.encode(expected)
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null
    if (!['student', 'admin'].includes(payload.role)) return null
    return payload
  } catch {
    return null
  }
}

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').flatMap((part) => {
    const separator = part.indexOf('=')
    if (separator < 0) return []
    const name = part.slice(0, separator).trim()
    try {
      return [[name, decodeURIComponent(part.slice(separator + 1).trim())]]
    } catch {
      return []
    }
  }))
}

export function sessionCookie(token, maxAgeSeconds, secure = true) {
  const attributes = [
    `mci_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (secure) attributes.push('Secure')
  return attributes.join('; ')
}

export function expiredSessionCookie(secure = true) {
  return sessionCookie('', 0, secure)
}
