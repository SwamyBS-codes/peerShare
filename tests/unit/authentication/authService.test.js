import { describe, expect, it } from 'vitest'
import { parseJwt } from '../../../client/src/services/authService.js'

function makeToken(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`
}

describe('JWT payload parsing', () => {
  it('decodes a valid JWT payload', () => {
    expect(parseJwt(makeToken({ id: 'user-id', userId: 'peer_1', exp: 9999999999 }))).toEqual({
      id: 'user-id',
      userId: 'peer_1',
      exp: 9999999999,
    })
  })

  it('returns null for malformed or incomplete tokens', () => {
    expect(parseJwt('not-a-token')).toBeNull()
    expect(parseJwt('header.not-json.signature')).toBeNull()
  })
})
