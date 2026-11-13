const jwt = require('../../../server/node_modules/jsonwebtoken')
const { randomBytes } = require('node:crypto')

let authenticateToken

beforeAll(() => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex')
  ;({ authenticateToken } = require('../../../server/src/middleware/auth'))
})

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

describe('token authentication middleware', () => {
  it('rejects a missing token', () => {
    const res = response()
    const next = vi.fn()

    authenticateToken({ headers: {} }, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects an invalid token', () => {
    const res = response()
    const next = vi.fn()

    authenticateToken({ headers: { authorization: 'Bearer invalid' } }, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('sets the authenticated user for a valid token', () => {
    const user = { id: '0da1df13-9503-4fdb-99a2-65a18fc480a7', userId: 'unit_peer' }
    const token = jwt.sign(user, process.env.JWT_SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = response()
    const next = vi.fn()

    authenticateToken(req, res, next)

    expect(req.user.id).toBe(user.id)
    expect(req.user.userId).toBe(user.userId)
    expect(next).toHaveBeenCalledOnce()
  })
})
